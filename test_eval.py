import asyncio
import logging

logging.basicConfig(level=logging.DEBUG)

async def main():
    try:
        from app.agents.evaluator import evaluator_node
        
        mock_state = {
            "repo_url": "https://github.com/psf/requests",
            "repo_local_path": "./repo",
            "issue_number": 7309,
            "issue_title": "Mock Issue Title",
            "issue_body": "Mock body",
            "classified_issue": {"type": "bug", "severity": "low", "summary": "mock summary"},
            "relevant_snippets": [{"file_path": "test.py", "start_line": 1, "end_line": 2, "snippet": "def mock(): pass"}],
            "patch_diff": "--- a/test.py\n+++ b/test.py\n@@ -1,2 +1,3 @@\n def mock():\n+    return True\n     pass"
        }
        
        result = await evaluator_node(mock_state)
        print("EVAL RESULT:")
        print(result.get("scores"))
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
