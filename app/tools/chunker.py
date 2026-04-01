"""Tool: Source code chunking using LlamaIndex.
Splits source files into overlapping code chunks for vector indexing.
Supports 11 languages. Settings: CHUNK_LINES=60, OVERLAP=15, MAX_CHARS=4000.
Updated: 2026-04-01
"""
import logging
from pathlib import Path

from llama_index.core import Document

logger = logging.getLogger("fixora.tools.chunker")

# Default chunk settings
CHUNK_LINES = 60
CHUNK_LINES_OVERLAP = 15
MAX_CHARS = 4000

# Language map by extension
LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".java": "java",
    ".go": "go",
    ".rb": "ruby",
    ".rs": "rust",
    ".c": "c",
    ".cpp": "cpp",
    ".cs": "c_sharp",
    ".swift": "swift",
    ".kt": "kotlin",
}


def chunk_repository(repo_path: str) -> list[dict]:
    """
    Read all source files from the repo and split them into code chunks.
    Returns a list of dicts: {file_path, start_line, end_line, snippet, language}
    """
    from app.tools.repo_utils import list_source_files

    files = list_source_files(repo_path)
    logger.info(f"[chunker] Chunking {len(files)} files...")

    documents: list[dict] = []

    for file_path in files:
        ext = Path(file_path).suffix
        language = LANGUAGE_MAP.get(ext, "python")

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            if not content.strip():
                continue

            lines = content.splitlines()
            
            for i in range(0, len(lines), CHUNK_LINES - CHUNK_LINES_OVERLAP):
                chunk_lines = lines[i:i + CHUNK_LINES]
                if not chunk_lines:
                    break
                
                snippet = "\\n".join(chunk_lines)
                if len(snippet) > MAX_CHARS:
                    snippet = snippet[:MAX_CHARS]
                
                documents.append({
                    "file_path": file_path,
                    "start_line": i + 1,
                    "end_line": min(i + CHUNK_LINES, len(lines)),
                    "snippet": snippet,
                    "language": language,
                })

        except Exception as exc:
            logger.warning(f"[chunker] Skipping {file_path}: {exc}")

    logger.info(f"[chunker] Total chunks: {len(documents)}")
    return documents
