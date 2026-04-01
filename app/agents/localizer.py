"""
Phase 3 — Context Retrieval & Bug Localization Agent.

Uses RAG (LlamaIndex + Chroma) to find the code snippets most relevant
to the reported issue, and ranks probable bug locations.
Retrieves TOP_K=8 snippets, de-duplicates by file, then keeps RERANK_TOP=5.
Updated: 2026-04-01
"""
import logging

from app.state import FixoraState
from app.tools.vector_store import query_index

logger = logging.getLogger("fixora.agents.localizer")

TOP_K = 8  # number of snippets to retrieve
RERANK_TOP = 5  # number to keep after re-ranking


def _build_query(state: FixoraState) -> str:
    """Construct a rich query string from the classified issue."""
    classified = state.get("classified_issue", {})
    title = state.get("issue_title", "")
    keywords = " ".join(classified.get("keywords", []))
    component = classified.get("component", "")
    summary = classified.get("summary", "")
    return f"{title} {summary} {component} {keywords}".strip()


async def localizer_node(state: FixoraState) -> FixoraState:
    """
    LangGraph node: retrieves relevant code snippets from ChromaDB
    and builds an ordered list of probable bug locations.
    """
    collection_name = state.get("collection_name", "")
    if not collection_name:
        return {**state, "error": "localizer: collection_name missing", "current_phase": "locate"}

    query = _build_query(state)
    logger.info(f"[Localizer] Query: {query!r}")

    try:
        snippets = query_index(query, collection_name, top_k=TOP_K)
        logger.info(f"[Localizer] Retrieved {len(snippets)} snippets.")

        # De-duplicate by file path and keep best score per file
        seen: dict[str, dict] = {}
        for s in snippets:
            fp = s["file_path"]
            if fp not in seen or s["score"] > seen[fp]["score"]:
                seen[fp] = s

        # Re-rank: sort by score descending, take top RERANK_TOP
        ranked = sorted(seen.values(), key=lambda x: x["score"], reverse=True)[:RERANK_TOP]
        probable_files = [s["file_path"] for s in ranked]

        logger.info(f"[Localizer] Probable bug files: {probable_files}")

        return {
            **state,
            "relevant_snippets": ranked,
            "probable_bug_files": probable_files,
            "current_phase": "located",
        }

    except Exception as exc:
        logger.exception(f"[Localizer] Error: {exc}")
        return {**state, "error": f"localizer: {exc}", "current_phase": "locate"}
