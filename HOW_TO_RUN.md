# 🚀 Fixora — How to Run (Step-by-Step)

> **Fixora** is an AI-powered GitHub Issue Resolution Agent. When a GitHub issue is opened, it clones the repo, understands the codebase with RAG (ChromaDB), generates a fix using an LLM, and creates a Pull Request automatically.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Clone & Setup](#2-clone--setup)
3. [Configure API Keys (.env)](#3-configure-api-keys-env)
4. [Run Method A — Local (Python only)](#4-run-method-a--local-python-only)
5. [Run Method B — Docker (Recommended)](#5-run-method-b--docker-recommended)
6. [Test the App](#6-test-the-app)
7. [Connect Real GitHub Webhook (Optional)](#7-connect-real-github-webhook-optional)
8. [API Reference](#8-api-reference)
9. [Pipeline Overview](#9-pipeline-overview)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Make sure the following are installed on your machine:

| Tool | Minimum Version | Download |
|------|----------------|----------|
| Python | 3.10+ | [python.org](https://python.org) |
| Git | Any | [git-scm.com](https://git-scm.com) |
| Docker Desktop | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) *(only for Method B)* |
| ngrok | Any | [ngrok.com/download](https://ngrok.com/download) *(only for webhook testing)* |

> ✅ **Tip:** You need at least one **free API key** — either [Groq](https://console.groq.com) (recommended), [OpenAI](https://platform.openai.com), or [DeepSeek](https://platform.deepseek.com).

---

## 2. Clone & Setup

**Step 1 — Navigate to the project folder:**

```powershell
cd "c:\Users\ASUS\OneDrive\Desktop\6th sem\fixora\Fixora--GithubIssueResolver"
```

**Step 2 — Install Python dependencies:**

```powershell
pip install -r requirements.txt
```

> ⏳ This installs FastAPI, LangGraph, LlamaIndex, ChromaDB, PyGithub, and all other dependencies. May take 2–5 minutes on first run.

---

## 3. Configure API Keys (.env)

**Step 1 — Copy the example env file:**

```powershell
copy .env.example .env
```

**Step 2 — Open `.env` in a text editor and fill in your keys:**

```env
# ── LLM Provider (pick ONE) ──────────────────────────────────────────────────

# Option A: Groq — FREE, recommended
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx   # Get from: https://console.groq.com

# Option B: OpenAI — Paid
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option C: DeepSeek — Free credits
# DEEPSEEK_API_KEY=your_deepseek_key_here

# ── Model Selection ───────────────────────────────────────────────────────────
LLM_PROVIDER=groq                        # Change to "openai" or "deepseek" if using those
LLM_MODEL=llama3-8b-8192                 # Groq model; change if using OpenAI/DeepSeek
EMBEDDING_MODEL=text-embedding-3-small   # OpenAI embeddings (requires OPENAI_API_KEY too)

# ── GitHub ────────────────────────────────────────────────────────────────────
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx  # From: GitHub → Settings → Developer settings → Personal access tokens
GITHUB_WEBHOOK_SECRET=my_random_secret_string  # Any string you choose — must match your GitHub webhook config

# ── ChromaDB (leave defaults for local run) ───────────────────────────────────
CHROMA_HOST=localhost
CHROMA_PORT=8001

# ── App ───────────────────────────────────────────────────────────────────────
LOG_LEVEL=INFO
APP_HOST=0.0.0.0
APP_PORT=8000
```

### Where to get each key:

| Key | Where to get it | Free? |
|-----|----------------|-------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys | ✅ Free |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) → API Keys | ❌ Paid |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) | ✅ Free credits |
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens → Fine-grained | ✅ Free |
| `GITHUB_WEBHOOK_SECRET` | Any random string you make up (e.g., `mysecret123`) | ✅ Free |

> ⚠️ **GitHub Token permissions needed:** `repo` (read/write), `pull_requests` (write), `issues` (read)

---

## 4. Run Method A — Local (Python only)

Use this method when you **don't have Docker** or want a quick local test.

> ⚠️ **Note:** With this method, ChromaDB runs in-memory (no Docker needed), but data is lost on restart.

**Terminal 1 — Start the Fixora server:**

```powershell
python -m app.main
```

You should see:

```
INFO | fixora | Fixora starting up 🚀
INFO | uvicorn.server | Application startup complete.
INFO | uvicorn.server | Uvicorn running on http://0.0.0.0:8000
```

**Verify it's running — open in your browser:**

```
http://localhost:8000/health
```

Should return: `{"status": "ok"}`

---

## 5. Run Method B — Docker (Recommended)

Use this method for a **full production-like setup** including persistent ChromaDB.

**Step 1 — Make sure Docker Desktop is running.**

**Step 2 — Build and start all services:**

```powershell
docker-compose up --build
```

This starts two containers:
- `fixora-api` → Your FastAPI server on port `8000`
- `fixora-chromadb` → ChromaDB vector store on port `8001`

> ⏳ First run may take 3–5 minutes to build the Docker image.

**Step 3 — Verify both services are healthy:**

```powershell
# Check FastAPI
Invoke-RestMethod http://localhost:8000/health

# Check ChromaDB
Invoke-RestMethod http://localhost:8001/api/v1/heartbeat
```

**To stop the services:**

```powershell
docker-compose down
```

**To stop and wipe all data (vector store):**

```powershell
docker-compose down -v
```

---

## 6. Test the App

You have **three ways** to test, from easiest to most realistic:

---

### 🧪 Test 1 — Unit Tests (No API calls needed)

Runs the full pipeline with mocked LLM and GitHub — no real API keys required.

```powershell
pytest tests/ -v
```

Expected output: All tests passing ✅

---

### 🔧 Test 2 — Manual HTTP Trigger (Real LLM + GitHub)

Tests Fixora end-to-end without needing a GitHub webhook.

**Step 1 — Start the server** (if not already running):

```powershell
python -m app.main
```

**Step 2 — Open Swagger UI** in your browser to explore all endpoints interactively:

```
http://localhost:8000/docs
```

**Step 3 — Send a test issue** (open a new terminal):

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/webhook/trigger" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "repo_url": "https://github.com/octocat/Hello-World.git",
    "issue_number": 1,
    "issue_title": "Bug in main function",
    "issue_body": "The main function crashes when input is an empty string"
  }'
```

**Step 4 — Watch the pipeline run** in Terminal 1:

```
INFO | fixora | Processing issue #1 from https://github.com/...
INFO | fixora.agents.indexer    | Cloning repo...
INFO | fixora.agents.indexer    | Indexing complete. 42 chunks stored.
INFO | fixora.agents.processor  | Issue classified: bug
INFO | fixora.agents.localizer  | Found 3 relevant files.
INFO | fixora.agents.patcher    | Patch generated.
INFO | fixora.agents.evaluator  | Confidence score: 0.87
INFO | fixora.agents.patcher    | PR created: https://github.com/...
```

---

### 🌐 Test 3 — Real GitHub Webhook (Full Production Test)

This makes Fixora respond automatically when a real GitHub issue is opened.

**Step 1 — Start your server:**

```powershell
python -m app.main
```

**Step 2 — Expose your local server to the internet with ngrok:**

```powershell
ngrok http 8000
```

Copy the `https://` URL shown (e.g., `https://abc123.ngrok-free.app`).

**Step 3 — Add a webhook to your GitHub repo:**

1. Go to your GitHub repo → **Settings** → **Webhooks** → **Add webhook**
2. Fill in:

   | Field | Value |
   |-------|-------|
   | Payload URL | `https://abc123.ngrok-free.app/webhook/github` |
   | Content type | `application/json` |
   | Secret | *(your `GITHUB_WEBHOOK_SECRET` from `.env`)* |
   | Which events | Select **"Issues"** only |

3. Click **Add webhook** ✅

**Step 4 — Open an issue on your GitHub repo.**

Fixora will automatically:
1. Clone your repo
2. Understand the code with vector search
3. Generate a fix using the LLM
4. Create a Pull Request 🚀

---

## 7. Connect Real GitHub Webhook (Optional)

Refer to [Test 3 above](#-test-3--real-github-webhook-full-production-test) — it covers the full webhook setup.

---

## 8. API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info (`{"service": "Fixora", "status": "running"}`) |
| `/health` | GET | Health check (`{"status": "ok"}`) |
| `/docs` | GET | Interactive Swagger UI (auto-generated) |
| `/webhook/github` | POST | Receives real GitHub webhook events |
| `/webhook/trigger` | POST | Manual test trigger (no webhook needed) |
| `/api/*` | GET/POST | Additional API routes |

---

## 9. Pipeline Overview

When an issue is received (via webhook or manual trigger), Fixora runs this pipeline:

```
GitHub Issue Received
        │
        ▼
[1] Indexer         — Clone the repo & build ChromaDB vector index of all code
        │
        ▼
[2] IssueProcessor  — Classify the issue type (bug / feature / docs / etc.)
        │
        ▼
[3] Localizer       — Semantic search to find the most relevant files
        │
        ▼
[4] Patcher         — LLM generates a unified diff patch + test code
        │
        ▼
[5] Evaluator       — Score the patch confidence (0.0 – 1.0)
        │
        ▼
        PR created on GitHub ✅
```

---

## 10. Troubleshooting

### ❌ `ModuleNotFoundError: No module named 'app'`

Run the server as a **module**, not a script:
```powershell
# ✅ Correct
python -m app.main

# ❌ Wrong
python app/main.py
```

---

### ❌ `GROQ_API_KEY not set` or `401 Unauthorized`

- Make sure `.env` exists (copy from `.env.example`)
- Make sure `GROQ_API_KEY` is correctly pasted (no extra spaces)
- Make sure `LLM_PROVIDER=groq` in `.env`

---

### ❌ ChromaDB connection refused

If running **locally (Method A)**, ChromaDB runs in-memory — no connection needed.  
If running **Docker (Method B)**, make sure Docker Desktop is running and use:
```powershell
docker-compose up
```

---

### ❌ `Invalid webhook signature` (401)

The `GITHUB_WEBHOOK_SECRET` in your `.env` must **exactly match** what you entered in your GitHub webhook settings.

---

### ❌ No PR created after test trigger

Check the server logs for errors. Common causes:
- `GITHUB_TOKEN` missing or lacks `repo` write permission
- The `repo_url` you provided doesn't exist or is private without proper access

---

> 📚 **More docs:** See `AGENTS_EXPLAINED.md`, `CODE_EXPLANATION.md`, `CORE_WORKFLOW.md`, and `FREE_API_KEYS_GUIDE.md` in this folder for deeper dives.
