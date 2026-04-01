# 🧪 Fixora — Testing Guide

Three ways to test the app, from easiest to hardest..

---

## ✅ Prerequisites

```powershell
cd "c:\Users\ASUS\OneDrive\Desktop\6th sem\fixora\Fixora--GithubIssueResolver"
pip install -r requirements.txt
pip install groq pytest pytest-asyncio pytest-mock
```

---

## Method 1 — Unit & Integration Tests (No API calls)

Uses mocked LLM/GitHub. Tests the full pipeline with a fake bug locally.

```powershell
pytest tests/ -v
```

**What it tests:** Chunker, code applicator, and full pipeline end-to-end with stubbed LLM responses.

---

## Method 2 — Manual HTTP Trigger (Tests real Groq + GitHub)

**Step 1 — Start the server:**
```powershell
python -m app.main
```

**Step 2 — View interactive API docs:**
👉 [http://localhost:8000/docs](http://localhost:8000/docs)

**Step 3 — Send a test request** (new terminal):
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/webhook/trigger" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "repo_url": "https://github.com/octocat/Hello-World.git",
    "issue_number": 1,
    "issue_title": "Bug in main function",
    "issue_body": "The main function crashes when input is empty string"
  }'
```

**Step 4 — Check health:**
```powershell
Invoke-RestMethod http://localhost:8000/health
```

Watch the **server terminal** for live pipeline logs: index → classify → localize → patch → evaluate.

---

## Method 3 — Real GitHub Webhook (Full production test)

**Step 1 — Expose your server with ngrok:**
```powershell
# Download from https://ngrok.com/download, then:
ngrok http 8000
# Copy the https URL, e.g. https://abc123.ngrok.io
```

**Step 2 — Add webhook to your GitHub repo:**

| Setting | Value |
|---------|-------|
| Payload URL | `https://abc123.ngrok.io/webhook/github` |
| Content type | `application/json` |
| Secret | *(your `GITHUB_WEBHOOK_SECRET` from `.env`)* |
| Events | **Issues only** |

Go to: **Your Repo → Settings → Webhooks → Add webhook**

**Step 3 — Open an issue** on your GitHub repo and Fixora will automatically analyze it and create a PR! 🚀

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/webhook/github` | POST | Real GitHub webhook receiver |
| `/webhook/trigger` | POST | Manual test trigger (no webhook needed) |
| `/docs` | GET | Interactive Swagger UI |

---

## Pipeline Phases

```
Issue received
    │
    ▼
[1] Indexer      — Clone repo & build ChromaDB vector index
    │
    ▼
[2] IssueProcessor — Classify the issue (bug/feature/etc.)
    │
    ▼
[3] Localizer    — Find relevant files via semantic search
    │
    ▼
[4] Patcher      — Generate unified diff + test code
    │
    ▼
[5] Evaluator    — Score the patch (confidence 0-1)
    │
    ▼
    PR created on GitHub ✅
```
