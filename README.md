# Fixora — AI-Powered GitHub Issue Resolution Agent

> An autonomous multi-agent system that reads GitHub Issues, understands your codebase, generates patches, and opens Pull Requests — automatically.

---

## 🏗️ Architecture Overview

```
GitHub Issue Opened
        │
        ▼
┌─────────────────┐
│  FastAPI Webhook│ ← Validates HMAC-SHA256, fires background task
└────────┬────────┘
         │
         ▼  LangGraph Pipeline
┌────────────────────────────────────────────────────┐
│  Phase 1 │  Indexer       → Clone + Chunk + Chroma  │
│  Phase 2 │  Issue Parser  → Classify with LLM       │
│  Phase 3 │  Localizer     → RAG retrieval + rerank  │
│  Phase 4 │  Patcher       → Diff + Test generation  │
│  Phase 5 │  Evaluator     → Score + Create PR       │
└────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/your-org/fixora.git
cd fixora
cp .env.example .env
# Edit .env and fill in your API keys
```

### 2. Run with Docker (recommended)

```bash
docker-compose up --build
```

- **Fixora API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ChromaDB**: http://localhost:8001

### 3. Run locally (dev)

```bash
pip install -r requirements.txt
python -m app.main
```

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `DEEPSEEK_API_KEY` | DeepSeek API key (if using DeepSeek) |
| `LLM_PROVIDER` | `openai` or `deepseek` |
| `LLM_MODEL` | e.g. `gpt-4o` or `deepseek-coder` |
| `GITHUB_TOKEN` | Personal Access Token with `repo` scope |
| `GITHUB_WEBHOOK_SECRET` | The secret set in your GitHub webhook settings |
| `CHROMA_HOST` | ChromaDB host (default: `localhost`) |
| `CHROMA_PORT` | ChromaDB port (default: `8001`) |

---

## 📡 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/webhook/github` | GitHub webhook receiver |
| `POST` | `/webhook/trigger` | Manual pipeline trigger (testing) |

### Manual trigger example

```bash
curl -X POST http://localhost:8000/webhook/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/owner/repo.git",
    "issue_number": 42,
    "issue_title": "add() returns wrong result",
    "issue_body": "The add function subtracts instead of adding."
  }'
```

---

## 🔗 GitHub Webhook Setup

1. Go to your target repo → **Settings → Webhooks → Add webhook**
2. Payload URL: `https://<your-server>/webhook/github`
3. Content type: `application/json`
4. Secret: paste the value of `GITHUB_WEBHOOK_SECRET`
5. Events: select **Issues**
6. Save

---

## 🧪 Running Tests

```bash
# Install dev deps
pip install -r requirements.txt

# Run all tests
pytest tests/ -v

# Run only integration tests
pytest tests/test_integration.py -v
```

---

## 📁 Project Structure

```
fixora/
├── app/
│   ├── agents/           # 5 LangGraph nodes (one per phase)
│   │   ├── indexer.py        # Phase 1: Repo cloning + Chroma indexing
│   │   ├── issue_processor.py # Phase 2: Issue classification
│   │   ├── localizer.py      # Phase 3: RAG retrieval
│   │   ├── patcher.py        # Phase 4: Patch + test generation
│   │   └── evaluator.py      # Phase 5: Scoring + PR creation
│   ├── tools/            # Reusable utilities
│   │   ├── repo_utils.py     # Git clone + file listing
│   │   ├── chunker.py        # LlamaIndex code chunker
│   │   ├── vector_store.py   # Chroma read/write
│   │   ├── llm_client.py     # OpenAI/DeepSeek wrapper
│   │   ├── github_client.py  # PyGithub wrapper
│   │   └── code_applicator.py # Patch + commit utilities
│   ├── config.py         # Pydantic settings
│   ├── state.py          # Shared LangGraph state
│   ├── graph.py          # LangGraph wiring
│   ├── main.py           # FastAPI app
│   └── webhook.py        # Webhook router
├── tests/
│   └── test_integration.py
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---


---

## 📄 License

MIT
