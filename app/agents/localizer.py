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
from app.tools.llm_client import get_llm_client

logger = logging.getLogger("fixora.agents.localizer")

TOP_K = 8  # number of snippets to retrieve
RERANK_TOP = 5  # number to keep after re-ranking


async def _build_query(state: FixoraState) -> str:
    """Use the LLM to write a semantic search query designed for dense embeddings."""
    classified = state.get("classified_issue", {})
    title = state.get("issue_title", "")
    component = classified.get("component", "")
    summary = classified.get("summary", "")
    keywords = ", ".join(classified.get("keywords", []))

    prompt = f"""You are a Vector Search Query Architect.
Your job is to write EXACTLY ONE sentence that describes the Python code snippet 
capable of causing or fixing the following GitHub issue.

Do NOT just list keywords. The embedding model (BGE) uses semantic meaning, not keyword matching.
Example bad query: "headers session merge redirect"
Example good query: "Python code that prepares HTTP requests and merges session-level headers with request-level headers during redirects."

Issue Title: {title}
Component: {component}
Summary: {summary}
Keywords: {keywords}

Output ONLY the raw query string. No quotes, no markdown, no explanation.
"""
    try:
        llm = get_llm_client()
        response = await llm.ainvoke(prompt)
        query = response.content.strip()
        # Fallback if LLM outputs quotes
        if query.startswith('"') and query.endswith('"'):
            query = query[1:-1]
        return query
    except Exception as exc:
        logger.error(f"Failed to generate semantic query, falling back: {exc}")
        return f"{title} {summary} {component} {keywords}".strip()


async def _rerank_snippets(state: FixoraState, snippets: list[dict]) -> list[dict]:
    """
    Use the LLM to semantically score each snippet. 
    This prevents keyword-matched false positives (e.g. 'merge_hooks') 
    from being passed to the patcher instead of the true bug location.
    """
    if not snippets:
        return []

    title = state.get("issue_title", "")
    body = state.get("issue_body", "")

    llm = get_llm_client()
    scored_snippets = []

    for s in snippets:
        prompt = f"""You are an Expert Code Debugger.
Given the GitHub issue below, rate how relevant this specific Python code snippet is to 
fixing the bug. 

Issue Title: {title}
Issue Description: {body}

Code Snippet from {s['file_path']}:
```python
{s['snippet']}
```

Rate from 0 to 10. (10 = This code contains the bug or is exactly where the fix belongs. 0 = Completely unrelated keyword match).
Output ONLY the integer, nothing else.
"""
        try:
            resp = await llm.ainvoke(prompt)
            score_str = resp.content.strip()
            # Try to grab just the numbers
            import re
            match = re.search(r'\d+', score_str)
            score = int(match.group()) if match else 0
        except Exception as exc:
            logger.warning(f"Reranking score failed for {s['file_path']}: {exc}")
            score = s["score"] * 10  # fallback to vector search score scaled up

        # Add the LLM semantic score
        s["llm_score"] = score
        scored_snippets.append(s)

    # Filter out absolute junk (score < 4), keep top RERANK_TOP
    valid = [s for s in scored_snippets if s.get("llm_score", 0) >= 4]
    
    # If the LLM rejected everything, fall back to the top vector search result
    if not valid and scored_snippets:
        logger.warning("[Localizer] LLM rejected all snippets. Falling back to top vector match.")
        valid = [scored_snippets[0]]
        
    ranked = sorted(valid, key=lambda x: x.get("llm_score", 0), reverse=True)[:RERANK_TOP]
    return ranked


async def localizer_node(state: FixoraState) -> FixoraState:
    """
    LangGraph node: retrieves relevant code snippets from ChromaDB
    and builds an ordered list of probable bug locations.
    """
    collection_name = state.get("collection_name", "")
    if not collection_name:
        return {**state, "error": "localizer: collection_name missing", "current_phase": "locate"}

    query = await _build_query(state)
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

        # Step 2: Semantically Reweigh the snippets using the LLM (true understanding)
        ranked = await _rerank_snippets(state, list(seen.values()))
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
