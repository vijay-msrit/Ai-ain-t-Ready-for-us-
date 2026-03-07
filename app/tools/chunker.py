"""Tool: Source code chunking using LlamaIndex."""
import logging
from pathlib import Path

from llama_index.core import SimpleDirectoryReader, Document
from llama_index.core.node_parser import CodeSplitter

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

            # Use LlamaIndex CodeSplitter
            splitter = CodeSplitter(
                language=language,
                chunk_lines=CHUNK_LINES,
                chunk_lines_overlap=CHUNK_LINES_OVERLAP,
                max_chars=MAX_CHARS,
            )

            raw_doc = Document(text=content, metadata={"file_path": file_path})
            nodes = splitter.get_nodes_from_documents([raw_doc])

            for i, node in enumerate(nodes):
                documents.append({
                    "file_path": file_path,
                    "start_line": i * (CHUNK_LINES - CHUNK_LINES_OVERLAP),
                    "end_line": i * (CHUNK_LINES - CHUNK_LINES_OVERLAP) + CHUNK_LINES,
                    "snippet": node.get_content(),
                    "language": language,
                })

        except Exception as exc:
            logger.warning(f"[chunker] Skipping {file_path}: {exc}")

    logger.info(f"[chunker] Total chunks: {len(documents)}")
    return documents
