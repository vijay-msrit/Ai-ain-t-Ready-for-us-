"""
Phase 4 — Patch & Test Generation Agent.

Uses the LLM to generate a unified diff patch and a pytest test file,
then applies the patch to the local repo clone.
"""
import ast
import logging

from app.state import FixoraState
from app.tools.llm_client import get_llm_client
from app.tools.code_applicator import apply_patch, write_test_file

logger = logging.getLogger("fixora.agents.patcher")

PATCH_PROMPT = """
You are an expert software engineer. Your job is to fix the bug described in the GitHub issue below.

## Issue
Title: {title}
Summary: {summary}
Severity: {severity}

## Relevant Code Snippets
{snippets}

## Instructions
1. Produce a minimal, correct unified diff (git diff format) that fixes the bug.
2. Only modify what is necessary — do not refactor unrelated code.
3. Respond with ONLY the unified diff, starting with `---` and ending with the last `+` line.
4. Do NOT include any explanation or markdown — raw diff only.
"""

TEST_PROMPT = """
You are a senior test engineer. Write a pytest test suite for the following fix.

## Fixed Code (after patch)
{patched_snippet}

## Bug Summary
{summary}

## Instructions
- Write pytest test functions (e.g. `def test_<name>():`)
- Cover: the bug scenario (regression test), the happy path, and at least one edge case.
- Import only standard library + the module under test.
- Respond with ONLY the Python test file content. No markdown, no explanation.
"""


def _format_snippets(snippets: list[dict]) -> str:
    parts = []
    for s in snippets:
        parts.append(
            f"### File: {s['file_path']} (lines {s.get('start_line','?')}–{s.get('end_line','?')})\n"
            f"```python\n{s['snippet']}\n```"
        )
    return "\n\n".join(parts)


def _is_valid_python(code: str) -> bool:
    try:
        ast.parse(code)
        return True
    except SyntaxError:
        return False


async def patcher_node(state: FixoraState) -> FixoraState:
    """LangGraph node: generates patch + test, applies patch to local repo."""
    classified = state.get("classified_issue", {})
    snippets = state.get("relevant_snippets", [])
    repo_path = state.get("repo_local_path", "")

    if not snippets:
        return {**state, "error": "patcher: no relevant snippets to patch", "current_phase": "patch"}

    logger.info("[Patcher] Generating patch...")
    llm = get_llm_client()

    try:
        # ── Step 1: Generate patch ──────────────────────────────────────────────
        patch_prompt = PATCH_PROMPT.format(
            title=state.get("issue_title", ""),
            summary=classified.get("summary", ""),
            severity=classified.get("severity", "medium"),
            snippets=_format_snippets(snippets),
        )
        patch_response = await llm.ainvoke(patch_prompt)
        patch_diff = (patch_response.content if hasattr(patch_response, "content")
                      else str(patch_response)).strip()

        logger.info(f"[Patcher] Patch generated ({len(patch_diff)} chars).")

        # ── Step 2: Apply patch ─────────────────────────────────────────────────
        patch_applied = False
        if repo_path and patch_diff.startswith("---"):
            patch_applied = apply_patch(repo_path, patch_diff)
            logger.info(f"[Patcher] Patch applied: {patch_applied}")

        # ── Step 3: Generate tests ──────────────────────────────────────────────
        top_snippet = snippets[0]["snippet"] if snippets else ""
        test_prompt = TEST_PROMPT.format(
            patched_snippet=top_snippet,
            summary=classified.get("summary", ""),
        )
        test_response = await llm.ainvoke(test_prompt)
        test_code = (test_response.content if hasattr(test_response, "content")
                     else str(test_response)).strip()

        # Strip markdown fences
        if test_code.startswith("```"):
            test_code = "\n".join(test_code.split("\n")[1:]).strip("` \n")

        logger.info(f"[Patcher] Test code generated ({len(test_code)} chars). "
                    f"Valid Python: {_is_valid_python(test_code)}")

        # ── Step 4: Write test file ─────────────────────────────────────────────
        test_file_path = ""
        if repo_path and test_code:
            test_file_path = write_test_file(repo_path, state.get("issue_number", 0), test_code)
            logger.info(f"[Patcher] Test written to: {test_file_path}")

        return {
            **state,
            "patch_diff": patch_diff,
            "patch_applied": patch_applied,
            "test_code": test_code,
            "test_file_path": test_file_path,
            "current_phase": "patched",
        }

    except Exception as exc:
        logger.exception(f"[Patcher] Error: {exc}")
        return {**state, "error": f"patcher: {exc}", "current_phase": "patch"}
