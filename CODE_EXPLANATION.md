# Fixora — Complete Code Explanation

## 🧠 What Fixora Does (One Line)
> Fixora watches GitHub issues, finds the bug in your code using AI, generates a fix, writes tests, and opens a Pull Request — automatically.

---

## 🗺️ Project Structure (Mental Map)

```
fixora/
├── app/
│   ├── main.py               ← Web server entry point
│   ├── webhook.py            ← Listens for GitHub events
│   ├── graph.py              ← Pipeline manager (connects all agents)
│   ├── state.py              ← Shared data bag passed between agents
│   ├── config.py             ← Reads API keys from .env
│   ├── agents/               ← The 5 "worker" agents
│   │   ├── indexer.py            Phase 1: Clone + Index repo
│   │   ├── issue_processor.py    Phase 2: Classify the bug
│   │   ├── localizer.py          Phase 3: Find suspect files
│   │   ├── patcher.py            Phase 4: Generate fix + tests
│   │   └── evaluator.py          Phase 5: Score + Create PR
│   └── tools/                ← Helper utilities
│       ├── repo_utils.py         Git clone + file listing
│       ├── chunker.py            Code splitter
│       ├── vector_store.py       ChromaDB read/write
│       ├── llm_client.py         AI brain factory
│       ├── github_client.py      GitHub API wrapper
│       └── code_applicator.py    Patch + commit utilities
├── tests/
│   └── test_integration.py   ← Full pipeline tests with mocks
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## 🔄 How the Pipeline Flows

```
GitHub Issue Opened
       ↓
  webhook.py          ← Receives & verifies the GitHub event
       ↓
  graph.py            ← Orchestrates all 5 agents
       ↓
[Phase 1] indexer.py       → Clone repo → Chunk code → Store in ChromaDB
[Phase 2] issue_processor  → Ask LLM: what type of bug? which component?
[Phase 3] localizer.py     → Search ChromaDB for relevant code snippets
[Phase 4] patcher.py       → Generate unified diff patch + pytest tests
[Phase 5] evaluator.py     → Score patch → Run tests → Create GitHub PR
```

If any phase sets an `error` in the state, the pipeline stops immediately.

---

## 📄 File-by-File Explanation

---

### `config.py` — Settings / Configuration

**What it does:** Reads all secret keys from a `.env` file into a Python object.

```python
class Settings(BaseSettings):
    openai_api_key: str       # OpenAI key for GPT-4o
    github_token: str         # GitHub Personal Access Token
    github_webhook_secret: str # To verify GitHub's webhook calls
    chroma_host: str          # Where ChromaDB is running
    llm_provider: str         # "openai" or "deepseek"
```

**Key properties:**
- `effective_api_key` → returns the right key depending on `llm_provider`
- `effective_base_url` → if using DeepSeek, points to their API URL
- `chroma_url` → builds the full `http://host:port` URL for ChromaDB

**Simple explanation:** This is the **control panel**. If a required key is missing, the app tells you immediately instead of crashing later.

---

### `state.py` — The Shared Data Bag

**What it does:** Defines a `TypedDict` (a typed dictionary) that all 5 agents pass between each other — like a relay baton.

```python
class FixoraState(TypedDict, total=False):
    # Input
    repo_url: str           # e.g. "https://github.com/owner/repo"
    issue_title: str        # The bug title
    issue_body: str         # Full bug description

    # Phase 1 output
    collection_name: str    # ChromaDB collection ID
    indexed: bool           # Was the repo indexed successfully?

    # Phase 2 output
    classified_issue: dict  # {type, component, severity, summary, keywords}

    # Phase 3 output
    relevant_snippets: list # Top 5 code chunks that likely have the bug
    probable_bug_files: list# Ordered list of file paths

    # Phase 4 output
    patch_diff: str         # The actual git diff fix
    test_code: str          # Generated pytest content

    # Phase 5 output
    confidence_score: float # 0.0–1.0 quality score
    pr_url: str             # Final PR link on GitHub
    error: Optional[str]    # If something went wrong, set here
```

**Simple explanation:** Agent 1 adds `collection_name`, Agent 2 reads it and adds `classified_issue`, and so on. Everyone reads and writes to the same bag.

---

### `main.py` — The Web Server

**What it does:** Creates the FastAPI web server and registers the webhook router.

```python
app = FastAPI(title="Fixora", description="AI-Powered GitHub Issue Resolution Agent")
app.add_middleware(CORSMiddleware, allow_origins=["*"])  # Allow all origins
app.include_router(webhook_router, prefix="/webhook")   # Register routes

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Endpoints exposed:**
| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| POST | `/webhook/github` | GitHub webhook receiver |
| POST | `/webhook/trigger` | Manual test trigger |

**Simple explanation:** This is the **front door**. It starts the server and tells Flask "if someone calls `/webhook/github`, go to `webhook.py`".

---

### `webhook.py` — The Doorbell / Security Guard

**What it does:** Receives GitHub webhook calls, verifies they're genuine, and kicks off the pipeline.

```python
def _verify_signature(body: bytes, signature: str) -> bool:
    # Computes expected HMAC-SHA256 signature using our secret
    expected = "sha256=" + hmac.new(secret, body, sha256).hexdigest()
    # Compares in constant time (prevents timing attacks)
    return hmac.compare_digest(expected, signature)
```

**Flow:**
1. GitHub sends POST with `X-Hub-Signature-256` header
2. Fixora verifies the signature — if wrong, returns `401 Unauthorized`
3. Ignores non-"issues" events (e.g., pull_request, push)
4. Ignores issues that aren't "opened" or "reopened"
5. Builds `initial_state` dict and runs pipeline **in background** (so GitHub doesn't time out waiting)

**Simple explanation:** Think of it as the **security guard at the door**. It checks your ID (signature), decides if you're allowed in (is it an issue event?), then passes you to the right department (pipeline).

---

## 🤖 The 5 Agents

---

### Agent 1: `indexer.py` — Repository Indexer (Phase 1)

**Goal:** Download the repo and make it searchable.

```python
local_path = clone_repo(repo_url)          # Step 1: Download repo
documents = chunk_repository(local_path)   # Step 2: Split into chunks
build_index(documents, collection_name)    # Step 3: Store embeddings
```

**Step by step:**
1. `clone_repo()` downloads the repo to `/tmp/fixora_repos/<owner>_<repo>`
2. `chunk_repository()` breaks each source file into ~60-line overlapping chunks
3. `build_index()` converts each chunk to a vector embedding (numbers = meaning) and stores in ChromaDB

**Simple explanation:** Like making an **index at the back of a textbook**. Split the book into sections, then let you search "show me all pages about addition bugs."

---

### Agent 2: `issue_processor.py` — Issue Classifier (Phase 2)

**Goal:** Use GPT-4o to understand and classify the bug.

```python
CLASSIFICATION_PROMPT = """
Analyze this GitHub issue and return ONLY valid JSON:
{
  "type": "bug | enhancement | ...",
  "component": "which file/module is affected",
  "severity": "critical | high | medium | low",
  "summary": "one sentence description",
  "keywords": ["list", "of", "search", "terms"]
}
"""
```

- Sends issue title + body to the LLM
- Parses the JSON response
- Falls back to a safe default if JSON parsing fails

**Simple explanation:** Asks GPT: *"What kind of bug is this? Which part of the code is affected? Give me keywords I can use to search the codebase."*

---

### Agent 3: `localizer.py` — Bug Localizer (Phase 3)

**Goal:** Find which code snippets are most relevant to the reported bug.

```python
# Build a rich search query from the classification
query = f"{issue_title} {summary} {component} {keywords}"

# Search ChromaDB (semantic vector search)
snippets = query_index(query, collection_name, top_k=8)

# De-duplicate: one snippet per file, keep highest score
seen = {}
for s in snippets:
    if fp not in seen or s["score"] > seen[fp]["score"]:
        seen[fp] = s

# Re-rank: sort by score, keep top 5
ranked = sorted(seen.values(), key=lambda x: x["score"], reverse=True)[:5]
```

**Simple explanation:** Searches the indexed codebase like Google — but instead of keywords, it uses **semantic meaning**. "add function wrong result" finds `return a - b` even if those exact words aren't in the code.

---

### Agent 4: `patcher.py` — Patch & Test Generator (Phase 4)

**Goal:** Generate the actual code fix and write tests for it.

**Two LLM calls:**

**Call 1 — Generate the patch:**
```
"Fix this bug. Return ONLY a unified diff (git diff format). No explanation."
```
Output looks like:
```diff
--- a/calculator.py
+++ b/calculator.py
-    return a - b  # BUG
+    return a + b
```

**Call 2 — Generate tests:**
```
"Write pytest tests covering: the bug scenario, happy path, and an edge case."
```

**Then:**
1. Writes diff to `.fixora_patch.diff`
2. `git apply --check` (dry run — does it apply cleanly?)
3. If yes → `git apply` (actually applies it)
4. Writes test file to `tests/fixora/test_issue_<N>.py`

**Simple explanation:** GPT reads the buggy code and writes: "here's what line to change" (the diff), and "here's a test to prove it's fixed."

---

### Agent 5: `evaluator.py` — Evaluator & PR Creator (Phase 5)

**Goal:** Score the patch, run tests, and open a GitHub Pull Request.

**Three steps:**

**Step 1 — LLM self-scores the patch:**
```
"Score this patch 0.0–1.0:
  Does it fix the bug? (+0.4)
  Is the change minimal? (+0.3)
  Is the test good? (+0.2)
  Is the diff well-formed? (+0.1)"
```

**Step 2 — Actually run the tests:**
```python
result = subprocess.run(["pytest", test_file_path, "-v", "--timeout=30"])
test_passed = result.returncode == 0
```

**Step 3 — Create GitHub PR:**
```python
pr = repo.create_pull(
    title="[Fixora] Fix: add() returns wrong result (Issue #42)",
    body="## 🤖 Fixora Automated Fix\n...",  # Rich markdown body
    head="fixora/issue-42",
    base="main",
    draft=True   # Created as draft — needs human approval to merge
)
```

**Simple explanation:** The AI grades its own work, runs the tests to double-check, then creates a draft PR on GitHub so a human can review and merge it.

---

## 🛠️ The Tools (Helper Utilities)

---

### `repo_utils.py` — Git Helper

```python
def clone_repo(repo_url: str) -> str:
    # If already cloned → git pull (get latest)
    # If not cloned → git clone --depth=1 (shallow, faster)
    return str(local_path)

def list_source_files(repo_path: str) -> list[str]:
    # Walks directory tree
    # Includes: .py, .js, .ts, .java, .go, .rb, etc.
    # Skips: .git, node_modules, __pycache__, .venv, dist, build
```

---

### `chunker.py` — Code Splitter

Uses **LlamaIndex's `CodeSplitter`** to break source files into chunks.

```python
CHUNK_LINES = 60          # Each chunk = 60 lines
CHUNK_LINES_OVERLAP = 15  # 15-line overlap so no context is lost at boundaries
MAX_CHARS = 4000          # Max characters per chunk
```

Detects the programming language from file extension (`.py` → `python`, `.js` → `javascript`, etc.) so the splitter respects code structure.

---

### `vector_store.py` — ChromaDB Interface

```python
def build_index(documents, collection_name):
    # Converts each chunk text → vector embedding via OpenAI
    # Stores embedding + metadata (file_path, start_line, end_line) in ChromaDB

def query_index(query, collection_name, top_k=8):
    # Converts query text → vector embedding
    # Finds top_k most similar chunks in ChromaDB
    # Returns: [{file_path, start_line, end_line, snippet, score}]
```

---

### `llm_client.py` — AI Brain Factory

```python
@lru_cache(maxsize=1)   # Creates only ONE client and reuses it (efficient)
def get_llm_client() -> ChatOpenAI:
    # Supports OpenAI (GPT-4o) and DeepSeek (same OpenAI SDK, different base URL)
    return ChatOpenAI(model=settings.llm_model, api_key=..., temperature=0.1)
```

`temperature=0.1` means the AI gives **consistent, deterministic** answers rather than creative/random ones. Good for code generation.

---

### `github_client.py` — GitHub API Wrapper

```python
def create_pull_request(repo_url, branch_name, title, body, draft=True):
    # Parses "https://github.com/owner/repo.git" → "owner/repo"
    # Uses PyGithub to create a pull request
    # Creates the branch on GitHub if it doesn't exist yet
    return pr.html_url, pr.number

def add_issue_comment(repo_url, issue_number, comment):
    # Posts a comment on the original bug issue
```

---

### `code_applicator.py` — Patch Manager

```python
def apply_patch(repo_path, patch_diff):
    # 1. Writes diff to .fixora_patch.diff
    # 2. git apply --check (dry run, no changes made)
    # 3. If successful → git apply (actually applies it)
    # Returns True/False

def commit_patch(repo_path, issue_number, branch_name):
    # git checkout -b fixora/issue-42
    # git add -A
    # git commit -m "fix: automated patch for issue #42 [Fixora]"
    # git push origin fixora/issue-42

def write_test_file(repo_path, issue_number, test_code):
    # Creates tests/fixora/test_issue_42.py
    # Writes the generated pytest content
```

---

## 🧪 `test_integration.py` — How It's Tested

**Creates a fake repo with a deliberate bug:**
```python
def add(a, b):
    return a - b  # BUG: should be a + b
```

**Mocks all external services:**
```python
patch("app.tools.repo_utils.clone_repo", return_value=mock_repo)
patch("app.tools.vector_store.build_index", return_value=None)
patch("app.tools.vector_store.query_index", return_value=[fake_snippet])
patch("app.tools.llm_client.get_llm_client")  # Returns fake LLM
patch("app.tools.code_applicator.apply_patch", return_value=True)
patch("app.tools.github_client.create_pull_request", return_value=("url", 1))
```

**Asserts the pipeline works end-to-end:**
```python
assert final_state.get("error") is None
assert final_state.get("classified_issue", {}).get("type") == "bug"
assert final_state.get("pr_url") == "https://github.com/test/repo/pull/1"
assert final_state.get("confidence_score", 0) > 0
```

---

## 🐳 Docker Setup

### `Dockerfile`
```dockerfile
FROM python:3.11-slim
RUN apt-get install -y git patch    # Needed for applying diffs
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `docker-compose.yml`
Runs **two services** together:
| Service | Port | Purpose |
|---------|------|---------|
| `fixora-api` | 8000 | The FastAPI application |
| `chromadb` | 8001 | Vector database for code embeddings |

ChromaDB has a health check → Fixora only starts after ChromaDB is ready.

---

## 🔑 `.env.example` — Required Keys

```env
OPENAI_API_KEY=...            # GPT-4o + text-embedding-3-small
GITHUB_TOKEN=...              # Create PRs, read repos
GITHUB_WEBHOOK_SECRET=...     # Verify GitHub webhook calls
CHROMA_HOST=localhost         # Where ChromaDB runs
CHROMA_PORT=8001
LLM_MODEL=gpt-4o
LLM_PROVIDER=openai           # "openai" or "deepseek"
```

---

## 💡 One-Minute Explanation (For Viva / Presentation)

> *"Fixora is a 5-phase AI agent pipeline built with LangGraph and FastAPI.*
>
> *When a GitHub issue is opened, the webhook receiver validates the request and triggers the pipeline in the background.*
>
> *Phase 1 clones the repository and uses LlamaIndex to chunk the source code into pieces, then stores vector embeddings in ChromaDB.*
>
> *Phase 2 sends the issue to GPT-4o to classify the bug type, severity, affected component, and generate search keywords.*
>
> *Phase 3 uses those keywords to semantically query ChromaDB and retrieve the top 5 most relevant code snippets.*
>
> *Phase 4 prompts GPT-4o to generate a unified diff patch and a pytest test suite, then applies the patch using `git apply`.*
>
> *Phase 5 asks the LLM to self-evaluate the patch quality, runs the tests using subprocess, and finally creates a draft GitHub Pull Request using PyGithub.*
>
> *The entire pipeline uses a shared TypedDict state that all agents read from and write to, with automatic error-routing built into the LangGraph graph."*
