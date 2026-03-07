"""
Phase 2 — Issue Processing Agent.

Parses and classifies a GitHub issue using an LLM.
Outputs structured metadata: type, component, severity, summary.
"""
import json
import logging

from app.state import FixoraState
from app.tools.llm_client import get_llm_client
from app.agents.indexer import indexer_node

logger = logging.getLogger("fixora.agents.issue_processor")

CLASSIFICATION_PROMPT = """
You are a senior software engineer triaging a GitHub issue.
Analyze the issue below and respond with ONLY a valid JSON object. No extra text.

Issue Title: {title}
Issue Body:
{body}

JSON schema:
{{
  "type": "bug | enhancement | refactor | question | other",
  "component": "name of the affected module/file/class (best guess)",
  "severity": "critical | high | medium | low",
  "summary": "One-sentence plain-English description of the problem",
  "steps_to_reproduce": "Condensed steps if available, else empty string",
  "keywords": ["list", "of", "relevant", "terms"]
}}
"""


async def issue_processor_node(state: FixoraState) -> FixoraState:
    """
    LangGraph node: classifies the GitHub issue.
    Also triggers indexing if not yet done.
    """
    title = state.get("issue_title", "No title")
    body = state.get("issue_body", "No body")
    repo_url = state.get("repo_url", "")

    # ── Ensure repo is indexed ─────────────────────────────────────────────────
    if not state.get("indexed"):
        logger.info("[IssueProcessor] Repo not indexed — running indexer first.")
        state = await indexer_node(state)
        if state.get("error"):
            return state

    logger.info(f"[IssueProcessor] Classifying issue: '{title}'")

    try:
        llm = get_llm_client()
        prompt = CLASSIFICATION_PROMPT.format(title=title, body=body)
        response = await llm.ainvoke(prompt)

        # Extract text from response
        content = response.content if hasattr(response, "content") else str(response)

        # Strip markdown code fences if present
        content = content.strip().strip("```json").strip("```").strip()

        classified = json.loads(content)
        logger.info(f"[IssueProcessor] Classification: {classified}")

        return {
            **state,
            "classified_issue": classified,
            "current_phase": "parsed",
        }

    except json.JSONDecodeError as exc:
        logger.error(f"[IssueProcessor] Failed to parse LLM JSON: {exc}")
        # Fallback classification
        return {
            **state,
            "classified_issue": {
                "type": "bug",
                "component": "unknown",
                "severity": "medium",
                "summary": title,
                "steps_to_reproduce": "",
                "keywords": [],
            },
            "current_phase": "parsed",
        }
    except Exception as exc:
        logger.exception(f"[IssueProcessor] Error: {exc}")
        return {**state, "error": f"issue_processor: {exc}", "current_phase": "parse"}
