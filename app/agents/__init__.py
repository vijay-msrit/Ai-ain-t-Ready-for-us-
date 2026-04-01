# Fixora Agents Sub-Package
# Contains all 5 LangGraph pipeline agents:
#   Phase 1: indexer        — Clone & index repo into ChromaDB
#   Phase 2: issue_processor — Classify GitHub issue via LLM
#   Phase 3: localizer      — RAG retrieval of relevant code snippets
#   Phase 4: patcher        — Generate unified diff patch + pytest tests
#   Phase 5: evaluator      — Score patch & create GitHub PR
# Updated: 2026-04-01
