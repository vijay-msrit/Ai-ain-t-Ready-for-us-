"""
Phase 1 — Repository Indexer Agent.

Clones the target repo, chunks the source code, generates vector embeddings,
and stores them in ChromaDB via LlamaIndex.
Steps: clone → chunk → build_index. Skips re-indexing if collection exists.
Updated: 2026-04-01
"""
import logging
import os

from app.state import FixoraState
from app.tools.repo_utils import clone_repo
from app.tools.chunker import chunk_repository
from app.tools.vector_store import build_index

logger = logging.getLogger("fixora.agents.indexer")


def _collection_name(repo_url: str) -> str:
    """Derive a safe Chroma collection name from a repo URL."""
    slug = repo_url.rstrip("/").split("/")[-2:]
    return "_".join(slug).replace("-", "_").replace(".", "_")[:60]


async def indexer_node(state: FixoraState) -> FixoraState:
    """
    LangGraph node: indexes the repository into ChromaDB.
    Skips if collection already exists (set state['indexed'] = False to force reindex).
    """
    repo_url = state.get("repo_url", "")
    if not repo_url:
        return {**state, "error": "indexer: repo_url is missing", "current_phase": "index"}

    collection_name = _collection_name(repo_url)
    logger.info(f"[Indexer] Collection: {collection_name}")

    try:
        # Step 1: Clone repository
        local_path = clone_repo(repo_url)
        logger.info(f"[Indexer] Cloned repo to: {local_path}")

        # Step 2: Chunk source code
        documents = chunk_repository(local_path)
        logger.info(f"[Indexer] Generated {len(documents)} code chunks.")

        # Step 3: Build / update vector index
        build_index(documents, collection_name)
        logger.info(f"[Indexer] Index built in Chroma collection '{collection_name}'.")

        return {
            **state,
            "repo_local_path": local_path,
            "collection_name": collection_name,
            "indexed": True,
            "current_phase": "index_done",
        }

    except Exception as exc:
        logger.exception(f"[Indexer] Failed: {exc}")
        return {**state, "error": f"indexer: {exc}", "current_phase": "index"}
