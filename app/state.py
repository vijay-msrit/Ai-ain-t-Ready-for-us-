"""
Shared LangGraph state schema for the Fixora pipeline.
All agents read from and write to this TypedDict.
Fields are grouped by pipeline phase (Input → Index → Parse → Locate → Patch → Evaluate).
total=False means all fields are optional — agents only set what they produce.
Updated: 2026-04-02
"""
from typing import TypedDict, Optional


class FixoraState(TypedDict, total=False):
    # ── Input ──────────────────────────────────────────────────────────────────
    repo_url: str                   # e.g. "https://github.com/owner/repo"
    repo_local_path: str            # Local clone path on disk
    issue_event: dict               # Raw GitHub webhook payload

    # ── Phase 1: Indexing ──────────────────────────────────────────────────────
    collection_name: str            # Chroma collection for this repo
    indexed: bool                   # True if Chroma index exists
    target_commit_sha: Optional[str]  # "Time Machine" — parent commit of the closing commit

    # ── Phase 2: Issue Processing ──────────────────────────────────────────────
    classified_issue: dict          # {type, component, severity, summary, steps_to_reproduce}
    issue_number: int
    issue_title: str
    issue_body: str

    # ── Phase 3: Localization ──────────────────────────────────────────────────
    relevant_snippets: list[dict]   # [{file_path, start_line, end_line, snippet, score}]
    probable_bug_files: list[str]   # Ordered list of suspected file paths

    # ── Phase 4: Patch & Tests ─────────────────────────────────────────────────
    patch_diff: str                 # Unified diff string
    patch_applied: bool
    test_code: str                  # Generated pytest file content
    test_file_path: str             # Where the test was written

    # ── Phase 5: Evaluation & PR ───────────────────────────────────────────────
    confidence_score: float         # 0.0 – 1.0
    test_passed: bool
    pr_url: str                     # URL of the created GitHub PR
    pr_number: int

    # ── Control / Error ───────────────────────────────────────────────────────
    error: Optional[str]
    current_phase: str
