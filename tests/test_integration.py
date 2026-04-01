"""
Integration test — runs the full Fixora pipeline on a minimal mock repo.
Uses pytest-mock to stub LLM calls and GitHub API..
"""
import json
import os
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_repo(tmp_path: Path) -> str:
    """Create a minimal Python repository with a deliberate bug."""
    repo = tmp_path / "sample_repo"
    repo.mkdir()
    src = repo / "calculator.py"
    src.write_text(
        """
def add(a, b):
    return a - b  # BUG: should be a + b


def subtract(a, b):
    return a - b
""",
        encoding="utf-8",
    )
    (repo / "tests").mkdir()
    return str(repo)


@pytest.fixture
def sample_issue_event(mock_repo):
    return {
        "action": "opened",
        "issue": {
            "number": 42,
            "title": "add() returns wrong result",
            "body": "The add function returns subtraction instead of addition.",
        },
        "repository": {
            "full_name": "test-owner/sample-repo",
            "clone_url": "https://github.com/test-owner/sample-repo.git",
        },
    }


# ── Unit Tests ─────────────────────────────────────────────────────────────────

class TestChunker:
    def test_chunk_python_file(self, mock_repo):
        from app.tools.chunker import chunk_repository
        chunks = chunk_repository(mock_repo)
        assert len(chunks) > 0, "Should produce at least one chunk"
        for chunk in chunks:
            assert "snippet" in chunk
            assert "file_path" in chunk

    def test_empty_files_skipped(self, tmp_path):
        from app.tools.chunker import chunk_repository
        empty_file = tmp_path / "empty.py"
        empty_file.write_text("")
        chunks = chunk_repository(str(tmp_path))
        assert all(c["snippet"].strip() for c in chunks), "Empty files should be skipped"


class TestCodeApplicator:
    def test_write_test_file(self, tmp_path):
        from app.tools.code_applicator import write_test_file
        test_code = "def test_add():\n    assert 1 + 1 == 2\n"
        path = write_test_file(str(tmp_path), 42, test_code)
        assert Path(path).exists()
        assert Path(path).read_text() == test_code

    def test_write_test_creates_dirs(self, tmp_path):
        from app.tools.code_applicator import write_test_file
        test_code = "def test_example(): pass\n"
        path = write_test_file(str(tmp_path), 99, test_code)
        assert (tmp_path / "tests" / "fixora").exists()


# ── Integration Test ───────────────────────────────────────────────────────────

class TestFullPipeline:
    @pytest.mark.asyncio
    async def test_pipeline_end_to_end(self, mock_repo, sample_issue_event):
        """
        Mocked end-to-end pipeline test.
        - LLM calls are stubbed to return deterministic JSON / diffs.
        - Chroma / GitHub are mocked.
        """
        fake_classification = json.dumps({
            "type": "bug",
            "component": "calculator.py",
            "severity": "high",
            "summary": "add() uses subtraction operator instead of addition",
            "steps_to_reproduce": "Call add(1, 2) — returns -1 instead of 3",
            "keywords": ["add", "calculator", "arithmetic"],
        })

        fake_diff = (
            "--- a/calculator.py\n"
            "+++ b/calculator.py\n"
            "@@ -1,3 +1,3 @@\n"
            " def add(a, b):\n"
            "-    return a - b  # BUG: should be a + b\n"
            "+    return a + b\n"
        )

        fake_test = (
            "def test_add_basic():\n"
            "    from calculator import add\n"
            "    assert add(1, 2) == 3\n"
            "\n"
            "def test_add_negative():\n"
            "    from calculator import add\n"
            "    assert add(-1, -1) == -2\n"
        )

        mock_llm_response = MagicMock()
        mock_llm_response.content = fake_classification

        with (
            patch("app.tools.repo_utils.clone_repo", return_value=mock_repo),
            patch("app.tools.vector_store.build_index", return_value=None),
            patch("app.tools.vector_store.query_index", return_value=[
                {
                    "file_path": f"{mock_repo}/calculator.py",
                    "start_line": 0,
                    "end_line": 5,
                    "snippet": "def add(a, b):\n    return a - b",
                    "score": 0.95,
                }
            ]),
            patch("app.tools.llm_client.get_llm_client") as mock_llm_factory,
            patch("app.tools.code_applicator.apply_patch", return_value=True),
            patch("app.tools.github_client.create_pull_request",
                  return_value=("https://github.com/test/repo/pull/1", 1)),
        ):
            mock_llm = AsyncMock()
            mock_llm.ainvoke = AsyncMock(side_effect=[
                MagicMock(content=fake_classification),   # Phase 2 classification
                MagicMock(content=fake_diff),             # Phase 4 patch
                MagicMock(content=fake_test),             # Phase 4 test
                MagicMock(content='{"score": 0.88, "reasoning": "Clean minimal fix"}'),  # Phase 5 eval
            ])
            mock_llm_factory.return_value = mock_llm

            from app.graph import run_pipeline

            initial_state = {
                "repo_url": "https://github.com/test-owner/sample-repo.git",
                "issue_event": sample_issue_event,
                "issue_number": 42,
                "issue_title": "add() returns wrong result",
                "issue_body": "The add function returns subtraction instead of addition.",
                "current_phase": "start",
                "indexed": False,
            }

            final_state = await run_pipeline(initial_state)

            assert final_state.get("error") is None, f"Pipeline errored: {final_state.get('error')}"
            assert final_state.get("classified_issue", {}).get("type") == "bug"
            assert final_state.get("pr_url") == "https://github.com/test/repo/pull/1"
            assert final_state.get("confidence_score", 0) > 0
