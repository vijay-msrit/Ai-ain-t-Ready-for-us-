"""Tool: ChromaDB vector store integration via LlamaIndex.
build_index() inserts code chunks; query_index() retrieves top-k similar snippets.
Embedding model: BAAI/bge-small-en-v1.5 (local HuggingFace, no API key needed).
Updated: 2026-04-01
"""
import logging

import chromadb
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core.schema import TextNode
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from app.config import settings

logger = logging.getLogger("fixora.tools.vector_store")



def _get_chroma_collection(collection_name: str):
    """Connect to ChromaDB using local persistent storage (no server needed)."""
    # PersistentClient stores data on disk — no Docker or server required.
    client = chromadb.PersistentClient(path="./chroma_data")
    collection = client.get_or_create_collection(collection_name)
    return client, collection


def _get_embedding_model():
    # Uses local HuggingFace model — no API key required.
    # Model downloads automatically on first use (~130MB for bge-small-en-v1.5).
    return HuggingFaceEmbedding(model_name=settings.embedding_model)


def build_index(documents: list[dict], collection_name: str) -> None:
    """
    Insert code chunks into a Chroma collection.
    Each document dict must have: file_path, snippet, start_line, end_line.
    """
    _client, collection = _get_chroma_collection(collection_name)
    embed_model = _get_embedding_model()

    logger.info(f"[vector_store] Inserting {len(documents)} nodes into '{collection_name}'...")
    
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        
        ids = [f"{doc['file_path']}_{doc.get('start_line',0)}_{j}" for j, doc in enumerate(batch)]
        texts = [doc["snippet"] for doc in batch]
        metadatas = [{
            "file_path": doc["file_path"],
            "start_line": doc.get("start_line", 0),
            "end_line": doc.get("end_line", 0),
            "language": doc.get("language", "unknown")
        } for doc in batch]
        
        # Get embeddings natively
        embeddings = [embed_model.get_text_embedding(text) for text in texts]
        
        # Use upsert to safely insert or update existing chunks without deleting the DB
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=texts
        )

    logger.info(f"[vector_store] Done inserting into '{collection_name}'.")


def query_index(query: str, collection_name: str, top_k: int = 8) -> list[dict]:
    """
    Query a Chroma collection and return top-k relevant code snippets.
    Returns list of: {file_path, start_line, end_line, snippet, score}
    """
    _client, collection = _get_chroma_collection(collection_name)
    embed_model = _get_embedding_model()

    query_embedding = embed_model.get_text_embedding(query)
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )

    out = []
    if not results["documents"] or not results["documents"][0]:
        return out

    # Chroma returns lists of lists for multiple queries. We only have 1 query.
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    distances = results["distances"][0]

    for doc, meta, dist in zip(docs, metas, distances):
        out.append({
            "file_path": meta.get("file_path", "unknown"),
            "start_line": meta.get("start_line", 0),
            "end_line": meta.get("end_line", 0),
            "snippet": doc,
            # Chroma distances are typically L2 or Cosine distance; flip them so higher=better 
            "score": 1.0 / (1.0 + float(dist)),
        })

    return out
