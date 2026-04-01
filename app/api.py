"""
REST API routes for the Fixora frontend.

POST /api/run   — kick off the full 5-agent pipeline (blocks until done)
GET  /api/issue     — return classified issue from last run
GET  /api/localize  — return relevant snippets + probable bug files
GET  /api/patch     — return generated diff
GET  /api/evaluate  — return confidence scores + PR info
NOTE: All state is held in-memory (_state dict) — single-session only.
Updated: 2026-04-02
"""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.graph import run_pipeline
from app.tools.github_client import get_issue, get_historical_context

logger = logging.getLogger("fixora.api")
router = APIRouter()

# ── In-memory single-session state store ─────────────────────────────────────
_state: dict = {}


# ── Request schema ────────────────────────────────────────────────────────────
class RunRequest(BaseModel):
    repo_url: str
    issue_number: int = 1
    issue_title: str = ""
    issue_body: str = ""
    time_machine: bool = True   # If True, auto-resolve parent commit SHA via GitHub timeline


# ── POST /api/index  (frontend calls this first) ──────────────────────────────
@router.post("/index")
async def index_and_run(req: RunRequest):
    """
    Run the full Fixora pipeline (index → parse → locate → patch → evaluate).
    Blocks until all 5 agents complete, then caches the final state.

    Time Machine mode (time_machine=True, default):
      Resolves the parent SHA of the commit that closed the issue so the
      indexer checks out the *broken* state of the codebase before embedding.
    """
    global _state
    _state = {}  # clear previous run

    # ── Auto-fetch issue details from GitHub if not provided ─────────────────
    issue_title = req.issue_title.strip()
    issue_body  = req.issue_body.strip()
    if not issue_title:
        try:
            gh_issue   = get_issue(req.repo_url, req.issue_number)
            issue_title = gh_issue["title"]
            issue_body  = issue_body or gh_issue["body"]
            logger.info(f"[API] Auto-fetched issue #{req.issue_number}: {issue_title!r}")
        except Exception as exc:
            logger.warning(f"[API] Could not fetch issue from GitHub: {exc}")

    # ── Time Machine: resolve parent commit SHA ───────────────────────────────
    target_commit_sha: str | None = None
    if req.time_machine:
        try:
            target_commit_sha = get_historical_context(req.repo_url, req.issue_number)
            if target_commit_sha:
                logger.info(
                    f"[API] Time Machine active — indexing at commit {target_commit_sha[:8]} "
                    f"(pre-fix state for issue #{req.issue_number})"
                )
            else:
                logger.info(
                    f"[API] Time Machine: issue #{req.issue_number} is open or has no "
                    "closing commit — indexing latest HEAD."
                )
        except Exception as exc:
            # Non-fatal: log & continue without time travel
            logger.warning(
                f"[API] Time Machine resolution failed for issue #{req.issue_number}: {exc}. "
                "Falling back to latest HEAD."
            )

    initial_state = {
        "repo_url": req.repo_url,
        "issue_event": {},
        "issue_number": req.issue_number,
        "issue_title": issue_title,
        "issue_body": issue_body,
        "current_phase": "start",
        "indexed": False,
        "target_commit_sha": target_commit_sha,  # None → latest HEAD
    }

    logger.info(f"[API] Starting pipeline: {req.repo_url} | issue #{req.issue_number}")
    final = await run_pipeline(initial_state)

    # Only throw 500 if it didn't finish the pipeline (i.e. not "done")
    if final.get("error") and final.get("current_phase") != "done":
        raise HTTPException(status_code=500, detail=final["error"])

    _state = final
    logger.info(f"[API] Pipeline complete. Phase: {final.get('current_phase')}")
    return {
        "status": "indexed",
        "collection_name": final.get("collection_name"),
        "time_machine_sha": target_commit_sha,
    }


# ── GET /api/issue ────────────────────────────────────────────────────────────
@router.get("/issue")
async def get_issue():
    """Return AI-classified issue breakdown."""
    _require_state()
    classified = _state.get("classified_issue", {})
    return {
        "title": _state.get("issue_title", ""),
        "type": classified.get("type", "bug"),
        "component": classified.get("component", "unknown"),
        "severity": classified.get("severity", "medium"),
        "summary": classified.get("summary", ""),
        "steps_to_reproduce": classified.get("steps_to_reproduce", []),
        "keywords": classified.get("keywords", []),
    }


# ── GET /api/localize ─────────────────────────────────────────────────────────
@router.get("/localize")
async def get_localize():
    """Return relevant code snippets and ranked bug files."""
    _require_state()
    return {
        "relevant_snippets": _state.get("relevant_snippets", []),
        "probable_bug_files": _state.get("probable_bug_files", []),
    }


# ── GET /api/patch ────────────────────────────────────────────────────────────
@router.get("/patch")
async def get_patch():
    """Return the generated unified diff and change stats."""
    _require_state()
    diff = _state.get("patch_diff", "")
    files = list({s["file_path"] for s in _state.get("relevant_snippets", [])})
    return {
        "diff": diff,
        "files_changed": len(files),
    }


# ── GET /api/evaluate ─────────────────────────────────────────────────────────
@router.get("/evaluate")
async def get_evaluate():
    """Return LLM-grounded evaluation: real sub-scores, test cases, and PR info."""
    _require_state()
    confidence = _state.get("confidence_score", 0.0)
    issue_num  = _state.get("issue_number", "auto")
    classified = _state.get("classified_issue", {})

    return {
        # Real LLM-produced scores (each independently evaluated)
        "confidence_score": confidence,
        "score_breakdown": _state.get("score_breakdown", {}),
        "score_reasoning": _state.get("score_reasoning", ""),
        "verdict": _state.get("verdict", "needs_review"),
        # Issue context
        "issue_title": _state.get("issue_title", ""),
        "issue_number": issue_num,
        "issue_type": classified.get("type", "bug"),
        "issue_severity": classified.get("severity", "medium"),
        "repo_url": _state.get("repo_url", ""),
        # Real test cases (generated from actual code snippets)
        "test_cases": _state.get("test_cases", []),
        # PR metadata
        "pr_link": _state.get("pr_url", ""),
        "pr_title": _state.get("pr_title", ""),
        "branch_name": f"fixora/issue-{issue_num}",
    }


# ── Helpers ───────────────────────────────────────────────────────────────────
def _require_state():
    if not _state:
        raise HTTPException(
            status_code=404,
            detail="No pipeline result found. POST to /api/index first.",
        )
