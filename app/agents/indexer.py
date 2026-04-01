"""
Phase 1 — Repository Indexer Agent.

Clones the target repo, chunks the source code, generates vector embeddings,
and stores them in ChromaDB via LlamaIndex.

Time Machine support: if state["target_commit_sha"] is set, the agent checks
out that specific commit before chunking — indexing the codebase *before* the
fix was applied (the "broken state").

Steps: clone → [checkout SHA] → chunk → build_index.
Updated: 2026-04-02
"""
import logging
import os

import git  # GitPython

from app.state import FixoraState
from app.tools.repo_utils import clone_repo
from app.tools.chunker import chunk_repository
from app.tools.vector_store import build_index

logger = logging.getLogger("fixora.agents.indexer")


def _collection_name(repo_url: str, sha: str | None = None) -> str:
    """
    Derive a safe Chroma collection name from a repo URL.
    When a Time Machine SHA is provided the first 8 chars are appended so
    each historical snapshot gets its own isolated collection.
    """
    slug = repo_url.rstrip("/").split("/")[-2:]
    base = "_".join(slug).replace("-", "_").replace(".", "_")[:50]
    if sha:
        return f"{base}_{sha[:8]}"
    return base[:60]


async def indexer_node(state: FixoraState) -> FixoraState:
    """
    LangGraph node: indexes the repository into ChromaDB.

    If state["target_commit_sha"] is present the cloned repo is checked out
    to that commit before indexing (Time Machine mode).
    """
    repo_url = state.get("repo_url", "")
    if not repo_url:
        return {**state, "error": "indexer: repo_url is missing", "current_phase": "index"}

    target_sha: str | None = state.get("target_commit_sha")
    collection_name = _collection_name(repo_url, target_sha)
    logger.info(f"[Indexer] Collection: {collection_name}")

    try:
        # ── Step 1: Clone repository ──────────────────────────────────────────
        local_path = clone_repo(repo_url)
        logger.info(f"[Indexer] Cloned repo to: {local_path}")

        # ── Step 2 (optional): Time Machine checkout ──────────────────────────
        if target_sha:
            logger.info(f"[Indexer] Time Machine — checking out parent commit {target_sha[:8]}")
            try:
                git_repo = git.Repo(local_path)
                git_repo.git.checkout(target_sha)
                logger.info(
                    f"[Indexer] Successfully checked out {target_sha[:8]}. "
                    f"HEAD is now detached at the pre-fix state."
                )
            except git.GitCommandError as git_exc:
                # Treat a failed checkout as non-fatal but log clearly.
                # We continue with whatever HEAD is (latest) so the pipeline
                # doesn't die completely.
                logger.warning(
                    f"[Indexer] Could not checkout {target_sha[:8]}: {git_exc}. "
                    "Proceeding with latest HEAD instead."
                )

        # ── Step 3: Chunk source code ─────────────────────────────────────────
        documents = chunk_repository(local_path)
        logger.info(f"[Indexer] Generated {len(documents)} code chunks.")

        # ── Step 4: Build / update vector index ──────────────────────────────
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
