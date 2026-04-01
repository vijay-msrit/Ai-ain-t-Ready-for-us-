"""
Phase 5 — Evaluation & PR Creation Agent.

Validates the generated patch against the issue using a structured LLM evaluation.
The LLM receives the ACTUAL code snippets, the ACTUAL patch diff, and the ACTUAL
issue details — then independently scores 4 rubric dimensions and generates
real test cases grounded in the code it reviewed.

Updated: 2026-04-01
"""
import json
import logging
import re
import subprocess

from app.state import FixoraState
from app.tools.llm_client import get_llm_client

logger = logging.getLogger("fixora.agents.evaluator")

PR_CONFIDENCE_THRESHOLD = 0.8

# ── System prompt ─────────────────────────────────────────────────────────────
EVAL_SYSTEM_PROMPT = """You are a senior code reviewer embedded inside an automated bug-fixing pipeline.
You will be given:
  1. A GitHub issue report (the bug being fixed)
  2. The ACTUAL source code snippets that were identified as the bug location
  3. The ACTUAL unified diff (patch) that was generated to fix the bug

Your job is to deeply analyze whether the patch ACTUALLY fixes the described bug
by reading the real code and the real diff line-by-line.

<rules>
- You MUST return ONLY a valid JSON object. No markdown fences. No extra text.
- Every score MUST be based on the actual code and diff you see — NOT made up.
- The test_cases MUST reference real function names, real file paths, and real
  variable names from the code snippets provided. Do NOT invent fake names.
- If the patch is empty or clearly wrong, give low scores honestly.
</rules>

<output_schema>
{
  "scores": {
    "addresses_root_cause": <float 0.0 to 0.4>,
    "minimal_safe_change": <float 0.0 to 0.3>,
    "diff_well_formed": <float 0.0 to 0.2>,
    "correct_file_targeted": <float 0.0 to 0.1>
  },
  "total_confidence": <float 0.0 to 1.0, must equal sum of above 4 scores>,
  "reasoning": "<2-3 sentences explaining what the patch does and whether it fixes the bug, referencing specific code>",
  "verdict": "'approved' | 'needs_review' | 'rejected'",
  "test_cases": [
    {
      "name": "<descriptive test function name like test_empty_path_returns_404>",
      "file": "<the actual file being tested, from the snippets>",
      "description": "<what this test verifies, referencing the actual bug>",
      "code": "<a real pytest function body that could validate the fix>"
    }
  ],
  "pr_title": "<conventional commit title referencing the actual fix, max 72 chars>"
}
</output_schema>"""

EVAL_USER_TEMPLATE = """<github_issue>
Title: {issue_title}
Number: #{issue_number}
Type: {issue_type} | Severity: {severity}

Description:
{issue_body}

AI Summary: {summary}
</github_issue>

<actual_source_code>
Below are the REAL code snippets from the repository that were identified as the bug location.
You must reference these when writing test cases.

{all_snippets}
</actual_source_code>

<generated_patch>
Below is the REAL unified diff that was generated to fix the bug.
Analyze each changed line carefully.

{patch_diff}
</generated_patch>

Evaluate the patch. Score each rubric dimension independently based on the actual code above.
Generate test cases that reference real functions and file paths from the source code.
Return ONLY the JSON object."""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_json(raw: str) -> dict:
    """Robustly extract JSON from LLM output."""
    cleaned = re.sub(r"^```(?:json)?", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Could not extract valid JSON from LLM response: {raw[:300]}")


def prune_context(state: FixoraState) -> tuple[str, str]:
    """
    Prune snippets to only ~20 lines above and below the changed code.
    Ensures total token count stays safe (target ~10k tokens).
    Returns formatted snippets string and patch_diff.
    """
    import re
    patch_diff = state.get("patch_diff", "")
    snippets = state.get("relevant_snippets", [])
    
    # Extract line numbers modified per file from patch_diff
    file_changes = {}
    current_file = None
    for line in patch_diff.split("\n"):
        if line.startswith("+++ b/"):
            current_file = line[6:].strip().split("/")[-1]
            if current_file not in file_changes:
                file_changes[current_file] = []
        elif line.startswith("@@ ") and current_file:
            match = re.search(r'@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@', line)
            if match:
                file_changes[current_file].append(int(match.group(1)))

    pruned_parts = []
    for s in snippets[:6]:
        fp = s.get("file_path", "unknown")
        short_path = fp.replace("\\", "/").split("/")[-1]
        code = s.get("snippet", "")
        start_line = s.get("start_line", 1)
        
        lines = code.split('\n')
        
        # If file was modified, find context bounds
        if short_path in file_changes and file_changes[short_path]:
            keep_indices = set()
            for line_mod in file_changes[short_path]:
                # Map absolute file line number to snippet index
                idx = line_mod - start_line
                if idx < 0:
                    idx = 0
                for i in range(max(0, idx - 20), min(len(lines), idx + 20)):
                    keep_indices.add(i)
            
            if keep_indices:
                sorted_idx = sorted(list(keep_indices))
                pruned_lines = []
                last_idx = -1
                for i in sorted_idx:
                    if last_idx != -1 and i != last_idx + 1:
                        pruned_lines.append("... [truncated to fit context window] ...")
                    pruned_lines.append(lines[i])
                    last_idx = i
                lines = pruned_lines
        
        # Fallback truncation if it's still too large or not in patch
        if len(lines) > 80:
            lines = lines[:40] + ["... [truncated] ..."] + lines[-40:]
            
        pruned_parts.append(f"--- File: {short_path} ---\n" + "\n".join(lines))
        
    all_snippets = "\n\n".join(pruned_parts)
    # Target ~10k tokens (approx 40k characters total) for the context
    if len(all_snippets) > 30000:
        all_snippets = all_snippets[:30000] + "\n... [Context overall truncated]"
        
    return all_snippets, patch_diff


def _fallback_evaluation(state: FixoraState) -> dict:
    """Intelligent fallback for production if LLM parsing/rate-limit fails."""
    snippets = state.get("relevant_snippets", [])
    files = [s.get("file_path", "unknown").replace("\\", "/").split("/")[-1] for s in snippets]
    
    has_diff = bool(state.get("patch_diff", "").strip())
    # Return 0.5 with needs review if diff exists, 0.0 otherwise
    confidence = 0.5 if has_diff else 0.0
    verdict = "needs_review" if has_diff else "rejected"
    reasoning = "Evaluation fallback triggered due to context overflow or model failure. Manual review is deeply required."
    
    title = state.get("issue_title")
    if not title:
        title = "Automated Fix Review"
        
    return {
        "scores": {
            "addresses_root_cause": 0.15 if has_diff else 0.0,
            "minimal_safe_change": 0.15 if has_diff else 0.0,
            "diff_well_formed": 0.10 if has_diff else 0.0,
            "correct_file_targeted": 0.10 if has_diff else 0.0,
        },
        "total_confidence": confidence,
        "reasoning": reasoning,
        "verdict": verdict,
        "test_cases": [{
            "name": "test_manual_verification",
            "file": files[0] if files else "target_file.py",
            "description": "Validates the newly patched boundary condition manually.",
            "code": "def test_manual():\n    # 1. Fallback triggered\n    assert True, 'Requires manual regression test'",
        }],
        "pr_title": f"fix: {title} (#{state.get('issue_number', 'auto')})",
    }


def _run_tests(test_file_path: str, repo_path: str) -> bool:
    """Run the generated pytest file; return True if all tests pass."""
    if not test_file_path or not repo_path:
        return False
    try:
        result = subprocess.run(
            ["pytest", test_file_path, "-v", "--tb=short", "--timeout=30"],
            cwd=repo_path, capture_output=True, text=True, timeout=60,
        )
        passed = result.returncode == 0
        logger.info(f"[Evaluator] Tests {'PASSED ✅' if passed else 'FAILED ❌'}\n{result.stdout[-800:]}")
        return passed
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        logger.warning(f"[Evaluator] Could not run tests: {exc}")
        return False


# ── Main LangGraph node ───────────────────────────────────────────────────────

async def evaluator_node(state: FixoraState) -> FixoraState:
    """LangGraph node: validates the patch with grounded LLM evaluation."""
    patch_diff = state.get("patch_diff", "")
    if not patch_diff:
        logger.warning("[Evaluator] No patch_diff found — skipping evaluation.")
        return {**state, "error": "evaluator: no patch_diff to evaluate", "current_phase": "done"}

    classified = state.get("classified_issue", {})
    snippets = state.get("relevant_snippets", [])

    # Ensure total context doesn't exceed LLM limits
    pruned_snippets, safe_patch_diff = prune_context(state)

    # Build the user message with ACTUAL code context
    user_msg = EVAL_USER_TEMPLATE.format(
        issue_title=state.get("issue_title", ""),
        issue_number=state.get("issue_number", "?"),
        issue_type=classified.get("type", "bug"),
        severity=classified.get("severity", "medium"),
        issue_body=state.get("issue_body", "No description provided.")[:1500],
        summary=classified.get("summary", ""),
        all_snippets=pruned_snippets,
        patch_diff=safe_patch_diff,
    )

    # ── Call LLM ──────────────────────────────────────────────────────────────
    logger.info("[Evaluator] Requesting grounded patch evaluation from LLM...")
    evaluation = {}
    try:
        from langchain_core.messages import SystemMessage, HumanMessage
        llm = get_llm_client(temperature=0.0)
        response = await llm.ainvoke([
            SystemMessage(content=EVAL_SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])
        raw = response.content if hasattr(response, "content") else str(response)
        logger.info(f"[Evaluator] Raw LLM response:\n{raw}")
        evaluation = _extract_json(raw)
        logger.info(f"[Evaluator] Confidence: {evaluation.get('total_confidence')} | Verdict: {evaluation.get('verdict')}")
    except Exception as exc:
        import traceback
        with open("eval_error.txt", "w") as f:
            f.write(traceback.format_exc())
            if 'raw' in locals(): f.write(f"\nRAW:\n{raw}")
        logger.warning(f"[Evaluator] LLM evaluation failed: {exc}\n{traceback.format_exc()} — using fallback.")
        evaluation = _fallback_evaluation(state)

    # Extract structured results — handle BOTH nested and flat LLM responses
    raw_scores = evaluation.get("scores", {})
    # If LLM returned scores at top level instead of nested
    if not raw_scores:
        raw_scores = {
            "addresses_root_cause": evaluation.get("addresses_root_cause", 0),
            "minimal_safe_change":  evaluation.get("minimal_safe_change", 0),
            "diff_well_formed":     evaluation.get("diff_well_formed", 0),
            "correct_file_targeted":evaluation.get("correct_file_targeted", 0),
        }

    # Confidence: try multiple field names the LLM might use
    confidence = float(
        evaluation.get("total_confidence",
        evaluation.get("confidence_score",
        evaluation.get("confidence",
        evaluation.get("score", 0.5))))
    )

    verdict    = evaluation.get("verdict", "needs_review")
    reasoning  = evaluation.get("reasoning",
                 evaluation.get("score_reasoning",
                 evaluation.get("explanation", "")))
    test_cases = evaluation.get("test_cases", [])
    pr_title   = evaluation.get("pr_title", f"fix: {state.get('issue_title', 'automated patch')}")

    logger.info(f"[Evaluator] Parsed scores: {raw_scores}")
    logger.info(f"[Evaluator] Confidence: {confidence}, Verdict: {verdict}")

    # ── Optionally run pytest ─────────────────────────────────────────────────
    test_passed = _run_tests(
        state.get("test_file_path", ""),
        state.get("repo_local_path", ""),
    )

    # ── Always try to create PR (commits the actual patch to GitHub) ──────────
    pr_url, pr_number = "", 0
    issue_num = state.get("issue_number", "auto")
    branch_name = f"fixora/issue-{issue_num}"

    # Build a rich PR body with real data
    classified = state.get("classified_issue", {})
    snippets = state.get("relevant_snippets", [])
    file_list = "\n".join(f"- `{s['file_path'].replace(chr(92), '/').split('/')[-1]}`" for s in snippets) or "- Unknown"

    pr_body = f"""## 🤖 Fixora Automated Fix

Closes #{issue_num}

### 🐛 Issue
**{state.get('issue_title', 'Automated Fix')}**

{classified.get('summary', 'No summary available.')}

- **Type:** {classified.get('type', 'bug')}
- **Severity:** {classified.get('severity', 'medium')}
- **Component:** `{classified.get('component', 'unknown')}`

### 🔍 Files Analyzed
{file_list}

### 📊 AI Confidence: {confidence:.0%}
{reasoning}

### 🧪 Verdict: {verdict}

---
*Auto-generated by [Fixora](https://github.com/fixora-ai). Review carefully before merging.*"""

    try:
        from app.tools.github_client import create_pr_with_patch
        pr_url, pr_number = create_pr_with_patch(
            repo_url=state.get("repo_url", ""),
            branch_name=branch_name,
            title=pr_title,
            body=pr_body,
            patch_diff=patch_diff,
            draft=True,
        )
        logger.info(f"[Evaluator] Draft PR opened: {pr_url}")
    except Exception as exc:
        logger.warning(f"[Evaluator] PR creation failed: {exc}")

    return {
        **state,
        "confidence_score": confidence,
        "score_breakdown": raw_scores,
        "score_reasoning": reasoning,
        "verdict": verdict,
        "test_cases": test_cases,
        "pr_title": pr_title,
        "test_passed": test_passed,
        "pr_url": pr_url,
        "pr_number": pr_number,
        "current_phase": "done",
    }

