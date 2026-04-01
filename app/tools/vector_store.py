"""Tool: ChromaDB vector store integration via LlamaIndex.
build_index() inserts code chunks; query_index() retrieves top-k similar snippets.
Embedding model defaults to text-embedding-3-small (OpenAI-compatible).
Updated: 2026-04-01
"""
import logging

import chromadb
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core.schema import TextNode
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding

from app.config import settings

logger = logging.getLogger("fixora.tools.vector_store")


def _get_chroma_collection(collection_name: str):
    """Connect to ChromaDB and return (client, collection)."""
    client = chromadb.HttpClient(
        host=settings.chroma_host,
        port=settings.chroma_port,
    )
    collection = client.get_or_create_collection(collection_name)
    return client, collection


def _get_embedding_model():
    return OpenAIEmbedding(
        model=settings.embedding_model,
        api_key=settings.effective_api_key,
    )


def build_index(documents: list[dict], collection_name: str) -> None:
    """
    Insert code chunks into a Chroma collection.
    Each document dict must have: file_path, snippet, start_line, end_line.
    """
    _client, collection = _get_chroma_collection(collection_name)
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    embed_model = _get_embedding_model()

    nodes = []
    for doc in documents:
        node = TextNode(
            text=doc["snippet"],
            metadata={
                "file_path": doc["file_path"],
                "start_line": doc.get("start_line", 0),
                "end_line": doc.get("end_line", 0),
                "language": doc.get("language", "unknown"),
            },
        )
        nodes.append(node)

    logger.info(f"[vector_store] Inserting {len(nodes)} nodes into '{collection_name}'...")
    VectorStoreIndex(
        nodes=nodes,
        storage_context=storage_context,
        embed_model=embed_model,
        show_progress=True,
    )
    logger.info(f"[vector_store] Done inserting into '{collection_name}'.")


def query_index(query: str, collection_name: str, top_k: int = 8) -> list[dict]:
    """
    Query a Chroma collection and return top-k relevant code snippets.
    Returns list of: {file_path, start_line, end_line, snippet, score}
    """
    _client, collection = _get_chroma_collection(collection_name)
    vector_store = ChromaVectorStore(chroma_collection=collection)
    embed_model = _get_embedding_model()

    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embed_model,
    )
    retriever = index.as_retriever(similarity_top_k=top_k)
    nodes_with_scores = retriever.retrieve(query)

    results = []
    for node_w_score in nodes_with_scores:
        node = node_w_score.node
        meta = node.metadata or {}
        results.append({
            "file_path": meta.get("file_path", "unknown"),
            "start_line": meta.get("start_line", 0),
            "end_line": meta.get("end_line", 0),
            "snippet": node.get_content(),
            "score": node_w_score.score or 0.0,
        })

    return results
