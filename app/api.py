"""
REST API routes for the Fixora frontend.

POST /api/run   — kick off the full 5-agent pipeline (blocks until done)
GET  /api/issue     — return classified issue from last run
GET  /api/localize  — return relevant snippets + probable bug files
GET  /api/patch     — return generated diff
GET  /api/evaluate  — return confidence scores + PR info
NOTE: All state is held in-memory (_state dict) — single-session only.
Updated: 2026-04-01
"""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.graph import run_pipeline

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


# ── POST /api/index  (frontend calls this first) ──────────────────────────────
@router.post("/index")
async def index_and_run(req: RunRequest):
    """
    Run the full Fixora pipeline (index → parse → locate → patch → evaluate).
    Blocks until all 5 agents complete, then caches the final state.
    """
    global _state
    _state = {}  # clear previous run

    initial_state = {
        "repo_url": req.repo_url,
        "issue_event": {},
        "issue_number": req.issue_number,
        "issue_title": req.issue_title,
        "issue_body": req.issue_body,
        "current_phase": "start",
        "indexed": False,
    }

    logger.info(f"[API] Starting pipeline: {req.repo_url} | issue #{req.issue_number}")
    final = await run_pipeline(initial_state)

    # Only throw 500 if it didn't finish the pipeline (i.e. not "done")
    if final.get("error") and final.get("current_phase") != "done":
        raise HTTPException(status_code=500, detail=final["error"])

    _state = final
    logger.info(f"[API] Pipeline complete. Phase: {final.get('current_phase')}")
    return {"status": "indexed", "collection_name": final.get("collection_name")}


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
    """Return confidence scores, test results, and PR info."""
    _require_state()
    confidence = _state.get("confidence_score", 0.0)
    issue_num  = _state.get("issue_number", "auto")
    return {
        "fix_confidence_score": confidence,
        "test_pass_rate": 1.0 if _state.get("test_passed") else 0.0,
        "code_quality_score": confidence,
        "pr_link": _state.get("pr_url", ""),
        "branch_name": f"fixora/issue-{issue_num}",
        "commit_message": (
            f"fix: {_state.get('issue_title', 'Automated fix')} "
            f"(closes #{issue_num})"
        ),
    }


# ── Helpers ───────────────────────────────────────────────────────────────────
def _require_state():
    if not _state:
        raise HTTPException(
            status_code=404,
            detail="No pipeline result found. POST to /api/index first.",
        )
