"""Tool: Repository cloning and file walking utilities.
Clones repos into system temp dir (fixora_repos/). Re-uses existing clones and pulls latest.
Filters source files by SUPPORTED_EXTENSIONS and skips SKIP_DIRS noise folders.
Updated: 2026-04-01
"""
import logging
import os
import shutil
import tempfile
from pathlib import Path

import git

logger = logging.getLogger("fixora.tools.repo_utils")

# Extensions to include during indexing
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".java", ".go", ".rb", ".rs",
    ".c", ".cpp", ".h", ".hpp", ".cs", ".php", ".swift",
    ".kt", ".scala", ".r", ".sh", ".yaml", ".yml", ".toml",
    ".json", ".md", ".txt",
}

# Directories to skip
SKIP_DIRS = {
    ".git", "__pycache__", "node_modules", ".venv", "venv",
    "dist", "build", ".eggs", ".mypy_cache", ".pytest_cache",
}

_CLONE_BASE = Path(tempfile.gettempdir()) / "fixora_repos"


def clone_repo(repo_url: str, force: bool = False) -> str:
    """
    Clone a GitHub repository to a local temp directory.
    Returns the local path. Re-uses existing clone unless force=True.
    """
    slug = repo_url.rstrip("/").split("/")[-2:]
    local_path = _CLONE_BASE / "_".join(slug)

    if local_path.exists() and not force:
        logger.info(f"[repo_utils] Repo already cloned at: {local_path}")
        # Pull latest changes
        try:
            repo = git.Repo(local_path)
            repo.remotes.origin.pull()
            logger.info("[repo_utils] Pulled latest changes.")
        except Exception as exc:
            logger.warning(f"[repo_utils] Pull failed (using existing): {exc}")
        return str(local_path)

    if local_path.exists():
        shutil.rmtree(local_path)

    local_path.mkdir(parents=True, exist_ok=True)
    logger.info(f"[repo_utils] Cloning {repo_url} → {local_path}")
    git.Repo.clone_from(repo_url, local_path, depth=1)
    return str(local_path)


def list_source_files(repo_path: str) -> list[str]:
    """Return all source file paths in the repo, filtered by extension and skipping noise dirs."""
    files = []
    root = Path(repo_path)
    for path in root.rglob("*"):
        if path.is_file() and path.suffix in SUPPORTED_EXTENSIONS:
            if not any(skip in path.parts for skip in SKIP_DIRS):
                files.append(str(path))
    return files
