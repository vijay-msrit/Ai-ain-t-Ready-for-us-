"""Tool: Apply unified diff patches and write test files to local repo.
Uses 'git apply' for cross-platform compatibility (works on Windows via Git for Windows).
Also handles branch creation, commit, push, and test file writing.
Updated: 2026-04-01
"""
import logging
import os
import subprocess
from pathlib import Path

logger = logging.getLogger("fixora.tools.code_applicator")


def apply_patch(repo_path: str, patch_diff: str) -> bool:
    """
    Apply a unified diff patch to the local repo using the `patch` CLI (Unix)
    or `git apply` (cross-platform).

    Returns True if successfully applied, False otherwise.
    """
    patch_file = Path(repo_path) / ".fixora_patch.diff"
    try:
        patch_file.write_text(patch_diff, encoding="utf-8")

        # Try `git apply` first (works on Windows too via Git for Windows)
        result = subprocess.run(
            ["git", "apply", "--check", str(patch_file)],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            # Dry-run passed — actually apply
            subprocess.run(
                ["git", "apply", str(patch_file)],
                cwd=repo_path,
                check=True,
                capture_output=True,
            )
            logger.info("[code_applicator] Patch applied via git apply.")
            return True
        else:
            logger.warning(f"[code_applicator] git apply --check failed:\n{result.stderr}")
            return False

    except subprocess.CalledProcessError as exc:
        logger.error(f"[code_applicator] Patch application failed: {exc.stderr}")
        return False
    except Exception as exc:
        logger.error(f"[code_applicator] Unexpected error: {exc}")
        return False
    finally:
        if patch_file.exists():
            patch_file.unlink()


def commit_patch(repo_path: str, issue_number: int, branch_name: str) -> bool:
    """
    Commit the applied patch on a new branch and push to origin.
    Returns True on success.
    """
    try:
        cmds = [
            ["git", "checkout", "-b", branch_name],
            ["git", "add", "-A"],
            ["git", "commit", "-m", f"fix: automated patch for issue #{issue_number} [Fixora]"],
            ["git", "push", "origin", branch_name],
        ]
        for cmd in cmds:
            subprocess.run(cmd, cwd=repo_path, check=True, capture_output=True, text=True)
        logger.info(f"[code_applicator] Committed and pushed branch: {branch_name}")
        return True
    except subprocess.CalledProcessError as exc:
        logger.error(f"[code_applicator] Git commit/push failed: {exc.stderr}")
        return False


def write_test_file(repo_path: str, issue_number: int, test_code: str) -> str:
    """
    Write the generated pytest file to the repo under tests/fixora/.
    Returns the absolute path of the written file.
    """
    test_dir = Path(repo_path) / "tests" / "fixora"
    test_dir.mkdir(parents=True, exist_ok=True)
    test_path = test_dir / f"test_issue_{issue_number}.py"
    test_path.write_text(test_code, encoding="utf-8")
    logger.info(f"[code_applicator] Test file written: {test_path}")
    return str(test_path)
