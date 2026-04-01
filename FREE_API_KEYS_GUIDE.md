# 🆓 Free API Keys Guide for Fixora

A step-by-step guide to getting all required API keys **for free**.

---

## 1. 🤖 `OPENAI_API_KEY` → Use **Google Gemini** (Free)

OpenAI's `gpt-4o` is **paid**. Use **Google Gemini** as a free alternative.

### Where to Get It:
1. Go to 👉 [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your **Google account**
3. Click **"Get API Key"** → **"Create API key"**
4. Copy the key (starts with `AIza...`)

### Update `.env`:
```env
OPENAI_API_KEY=AIza...   # Your Gemini key goes here.
LLM_PROVIDER=openai      # Will need code change (see note below)
LLM_MODEL=gemini-1.5-flash..
EMBEDDING_MODEL=models/embedding-001
```

> **Note:** Gemini requires using `google-generativeai` SDK instead of `openai`. You'll need to adjust `app/tools/llm_client.py` to use the Gemini client.

**Free Tier:** 15 requests/min, 1500 requests/day ✅

---

## 2. 🤖 `OPENAI_API_KEY` → Use **Groq** (Free, Fast)

Groq offers blazing-fast inference on open-source models **for free**.

### Where to Get It:
1. Go to 👉 [console.groq.com](https://console.groq.com)
2. Sign up with **Google/GitHub** account
3. Go to **API Keys** → **"Create API Key"**
4. Copy the key (starts with `gsk_...`)

### Update `.env`:
```env
OPENAI_API_KEY=gsk_...        # Groq key here
LLM_MODEL=llama3-70b-8192     # or mixtral-8x7b-32768
LLM_PROVIDER=openai           # Groq is OpenAI-compatible!
```

> **Best Option:** Groq uses the **OpenAI-compatible API**, so NO code changes needed. Just change the base URL in `llm_client.py` to `https://api.groq.com/openai/v1`.

**Free Tier:** Generous daily limits, no credit card needed ✅

---

## 3. 🤖 `DEEPSEEK_API_KEY` → Use **DeepSeek** (Free Credits)

DeepSeek provides free credits on sign-up.

### Where to Get It:
1. Go to 👉 [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up with **email**
3. Go to **API Keys** → **"Create new API key"**
4. Copy the key

### Update `.env`:
```env
DEEPSEEK_API_KEY=sk-...
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-coder
```

**Free Tier:** Free credits on signup (~$5 equivalent) ✅

---

## 4. 🐙 `GITHUB_TOKEN` → **GitHub Personal Access Token** (Always Free)

GitHub tokens are **completely free** for all users.

### Where to Get It:
1. Go to 👉 [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Set a note: `fixora-token`
4. Set expiration: **90 days** (or No expiration)
5. Check these scopes:
   - ✅ `repo` — Full repository access
   - ✅ `read:org` — Read org info (if needed)
   - ✅ `write:discussion` — To comment on issues
6. Click **"Generate token"** → Copy it (`ghp_...`)

### Update `.env`:
```env
GITHUB_TOKEN=ghp_...
```

**Free Tier:** Free for all GitHub accounts ✅

---

## 5. 🔐 `GITHUB_WEBHOOK_SECRET` → **Create It Yourself** (Free)

This is NOT a third-party key — you **make it up yourself**.

### How to Create It:
**Option A** — Use PowerShell:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

**Option B** — Use any random string generator:
- Go to 👉 [randomkeygen.com](https://randomkeygen.com)
- Copy any key from **"Strong Passwords"** section

### Update `.env`:
```env
GITHUB_WEBHOOK_SECRET=YourRandomStringHere123!
```

Then set the **same string** in GitHub:
1. Go to your repo → **Settings → Webhooks → Add webhook**
2. Paste the same string in the **"Secret"** field
3. Set Payload URL: `http://<your-server-ip>:8000/webhook`

**Free:** Always free ✅

---

## 6. 🗄️ `CHROMA_HOST` & `CHROMA_PORT` → **Local ChromaDB** (Free)

ChromaDB runs **locally** — no account or API key needed.

### Setup:
```powershell
pip install chromadb
chroma run --host localhost --port 8001
```

### Update `.env`:
```env
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

**Free:** Open-source, runs locally ✅

---

## ✅ Recommended Free Stack

| Key | Free Alternative | Link |
|-----|-----------------|------|
| `OPENAI_API_KEY` | **Groq** (best — OpenAI-compatible) | [console.groq.com](https://console.groq.com) |
| `OPENAI_API_KEY` | **Google Gemini** (backup) | [aistudio.google.com](https://aistudio.google.com) |
| `DEEPSEEK_API_KEY` | **DeepSeek** (free credits) | [platform.deepseek.com](https://platform.deepseek.com) |
| `GITHUB_TOKEN` | GitHub PAT (always free) | [github.com/settings/tokens](https://github.com/settings/tokens) |
| `GITHUB_WEBHOOK_SECRET` | Self-generated string | [randomkeygen.com](https://randomkeygen.com) |
| `CHROMA_HOST/PORT` | Local ChromaDB | `pip install chromadb` |

---

## 📋 Final Free `.env` Example (using Groq)

```env
# Using Groq as free OpenAI alternative
OPENAI_API_KEY=gsk_...              # From console.groq.com
GITHUB_TOKEN=ghp_...                # From github.com/settings/tokens
GITHUB_WEBHOOK_SECRET=RandomStr123  # Self-generated

CHROMA_HOST=localhost
CHROMA_PORT=8001

LLM_MODEL=llama3-70b-8192           # Groq's free model
EMBEDDING_MODEL=text-embedding-3-small
LLM_PROVIDER=openai                 # Groq is OpenAI-compatible

LOG_LEVEL=INFO
APP_HOST=0.0.0.0
APP_PORT=8000
```

> ⚠️ **One code change needed for Groq:** In `app/tools/llm_client.py`, set the base URL to `https://api.groq.com/openai/v1` when initializing the OpenAI client.
