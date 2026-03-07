# 🧠 Fixora — Complete Code Walkthrough (Interview Guide)

A file-by-file explanation of every module in the project, with code snippets and interview Q&A.

---

## 📁 Project Structure

```
Fixora--GithubIssueResolver/
├── app/
│   ├── main.py             ← FastAPI entry point
│   ├── config.py           ← All environment settings (Pydantic)
│   ├── state.py            ← Shared pipeline state schema (TypedDict)
│   ├── graph.py            ← LangGraph pipeline wiring
│   ├── webhook.py          ← GitHub webhook receiver
│   ├── agents/
│   │   ├── indexer.py      ← Phase 1: Clone repo + build vector index
│   │   ├── issue_processor.py ← Phase 2: Classify the GitHub issue
│   │   ├── localizer.py    ← Phase 3: Find relevant code via RAG
│   │   ├── patcher.py      ← Phase 4: Generate patch + tests
│   │   └── evaluator.py    ← Phase 5: Score patch + create GitHub PR
│   └── tools/
│       ├── llm_client.py   ← LLM factory (Groq/OpenAI/DeepSeek)
│       ├── repo_utils.py   ← Git clone + file walking
│       ├── chunker.py      ← Split source files into code chunks
│       ├── vector_store.py ← ChromaDB read/write via LlamaIndex
│       ├── code_applicator.py ← Apply diffs + write test files
│       └── github_client.py   ← GitHub API (PyGithub)
└── tests/
    └── test_integration.py ← Full pipeline test with mocks
```

---

## 🔁 End-to-End Flow

```
GitHub Issue Opened
        │
        ▼
   webhook.py  ──► validates HMAC signature, extracts payload
        │
        ▼
   graph.py    ──► run_pipeline() kicks off LangGraph
        │
   ┌────┴────────────────────────────────────┐
   │  parse → locate → patch → evaluate → END │
   └─────────────────────────────────────────┘
        │
   Each node is an agent that reads/writes FixoraState
```

---

## 1. `app/config.py` — Settings & Configuration

**What it does:** Loads all environment variables from `.env` using **Pydantic Settings**. Provides computed properties for the active LLM provider.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # API Keys
    groq_api_key: str = Field("", alias="GROQ_API_KEY")
    openai_api_key: str = Field("", alias="OPENAI_API_KEY")
    deepseek_api_key: str = Field("", alias="DEEPSEEK_API_KEY")

    llm_provider: str = Field("groq", alias="LLM_PROVIDER")
    llm_model: str = Field("openai/gpt-oss-120b", alias="LLM_MODEL")

    @property
    def effective_api_key(self) -> str:
        if self.llm_provider == "groq":
            return self.groq_api_key
        if self.llm_provider == "deepseek":
            return self.deepseek_api_key
        return self.openai_api_key

    @property
    def effective_base_url(self) -> str | None:
        if self.llm_provider == "groq":
            return "https://api.groq.com/openai/v1"
        if self.llm_provider == "deepseek":
            return "https://api.deepseek.com/v1"
        return None

settings = Settings()
```

**Interview talking points:**
- Used `pydantic-settings` for type-safe config — avoids `os.getenv()` scattered everywhere
- `total=False` pattern from TypedDict — all fields optional at import time
- `effective_api_key` and `effective_base_url` are computed properties — single place to switch providers
- Groq is **OpenAI-compatible**, so no code changes needed in LangChain — just change the base URL

---

## 2. `app/state.py` — Shared Pipeline State

**What it does:** Defines `FixoraState`, a `TypedDict` that acts as the shared memory across all 5 LangGraph agents.

```python
from typing import TypedDict, Optional

class FixoraState(TypedDict, total=False):
    # Input
    repo_url: str             # e.g. "https://github.com/owner/repo"
    repo_local_path: str      # Local clone path on disk
    issue_event: dict         # Raw GitHub webhook payload

    # Phase 1 - Indexing
    collection_name: str      # ChromaDB collection for this repo
    indexed: bool             # True once index is built

    # Phase 2 - Classification
    classified_issue: dict    # {type, component, severity, summary, keywords}
    issue_number: int
    issue_title: str
    issue_body: str

    # Phase 3 - Localization
    relevant_snippets: list[dict]   # [{file_path, start_line, end_line, snippet, score}]
    probable_bug_files: list[str]   # Ranked file paths

    # Phase 4 - Patch
    patch_diff: str           # Unified diff string
    patch_applied: bool
    test_code: str            # Generated pytest content
    test_file_path: str

    # Phase 5 - Evaluation
    confidence_score: float   # 0.0 – 1.0
    test_passed: bool
    pr_url: str
    pr_number: int

    # Control
    error: Optional[str]
    current_phase: str
```

**Interview talking points:**
- `TypedDict` is used instead of a class — it's pure Python dict at runtime (zero overhead), but gives **type hints** for editors and linters
- `total=False` means all fields are optional — agents only write fields they own
- This is the core of the **LangGraph state machine pattern** — state flows through nodes and each agent enriches it
- `current_phase` + `error` are used for **conditional routing** in graph.py

---

## 3. `app/main.py` — FastAPI Server Entry Point

**What it does:** Creates and configures the FastAPI app, mounts the webhook router, exposes health endpoints.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.webhook import router as webhook_router
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Fixora starting up 🚀")
    yield
    logger.info("Fixora shutting down.")

app = FastAPI(title="Fixora", version="0.1.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
app.include_router(webhook_router, prefix="/webhook", tags=["webhook"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Interview talking points:**
- `lifespan` context manager (new FastAPI pattern) replaces deprecated `startup`/`shutdown` events
- CORS middleware is configured to allow all origins — suitable for development, should be tightened for production
- The app is modular: `webhook_router` is registered separately, keeping main.py clean
- `uvicorn.run(..., reload=True)` for hot reload during development

---

## 4. `app/webhook.py` — GitHub Webhook Receiver

**What it does:** Receives GitHub webhook POST events, validates the **HMAC-SHA256 signature**, and triggers the pipeline asynchronously.

```python
def _verify_signature(body: bytes, signature: str) -> bool:
    """Verify GitHub's HMAC-SHA256 webhook signature."""
    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

@router.post("/github")
async def github_webhook(request, background_tasks, x_hub_signature_256, x_github_event):
    body = await request.body()

    if not _verify_signature(body, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    if x_github_event != "issues":
        return {"status": "ignored"}   # Only handle issue events

    payload = json.loads(body)
    if payload["action"] not in ("opened", "reopened"):
        return {"status": "ignored"}   # Only new/reopened issues

    # Kick off pipeline in background — webhook returns 200 immediately
    background_tasks.add_task(run_pipeline, initial_state)
    return {"status": "accepted", "issue_number": issue_number}

@router.post("/trigger")          # ← Manual test endpoint (no GitHub needed)
async def manual_trigger(payload: dict, background_tasks):
    background_tasks.add_task(run_pipeline, initial_state)
    return {"status": "accepted"}
```

**Interview talking points:**
- **HMAC-SHA256 signature verification** prevents fake webhook calls — critical security step
- `hmac.compare_digest()` is used instead of `==` to prevent timing attacks
- `BackgroundTasks` makes the webhook return HTTP 200 immediately — GitHub expects a fast response, then the pipeline runs async in the background
- `/webhook/trigger` endpoint lets you test without setting up a real GitHub webhook — very useful for development

---

## 5. `app/graph.py` — LangGraph Pipeline

**What it does:** Wires all 5 agents into a **LangGraph StateGraph** with error-checking conditional edges.

```python
from langgraph.graph import StateGraph, END

def _should_abort(state: FixoraState) -> str:
    """Route to END if any agent set an error."""
    if state.get("error"):
        return "end"
    return "continue"

def build_graph() -> StateGraph:
    graph = StateGraph(FixoraState)

    # Register nodes (agents)
    graph.add_node("index",    indexer_node)
    graph.add_node("parse",    issue_processor_node)
    graph.add_node("locate",   localizer_node)
    graph.add_node("patch",    patcher_node)
    graph.add_node("evaluate", evaluator_node)

    graph.set_entry_point("parse")  # ← starts here

    # After each node, check if there's an error
    for src, dst in [("parse", "locate"), ("locate", "patch"), ("patch", "evaluate")]:
        graph.add_conditional_edges(
            src,
            _should_abort,
            {"continue": dst, "end": END},
        )

    graph.add_edge("evaluate", END)
    return graph.compile()

async def run_pipeline(initial_state: dict) -> FixoraState:
    final_state = await _compiled_graph.ainvoke(initial_state)
    return final_state
```

**Interview talking points:**
- **LangGraph** is a framework for building stateful multi-agent pipelines as directed graphs
- Each `add_node()` maps a string name to an async Python function (the agent)
- `add_conditional_edges()` checks `_should_abort` after each phase — if any agent sets `error`, the graph short-circuits to `END`
- The graph is **compiled once** at module load (`_compiled_graph = build_graph()`) and reused for all requests — efficient
- `ainvoke()` runs the full graph asynchronously

---

## 6. `app/agents/indexer.py` — Phase 1: Repository Indexer

**What it does:** Clones the GitHub repo, chunks its code into 60-line windows, generates vector embeddings, stores them in ChromaDB.

```python
def _collection_name(repo_url: str) -> str:
    """Create a safe Chroma collection name from the repo URL."""
    slug = repo_url.rstrip("/").split("/")[-2:]     # ["owner", "repo"]
    return "_".join(slug).replace("-", "_").replace(".", "_")[:60]

async def indexer_node(state: FixoraState) -> FixoraState:
    collection_name = _collection_name(repo_url)

    # Step 1: Clone the repo (or pull if already cloned)
    local_path = clone_repo(repo_url)

    # Step 2: Split all source files into code chunks
    documents = chunk_repository(local_path)

    # Step 3: Build vector embeddings and store in ChromaDB
    build_index(documents, collection_name)

    return {
        **state,
        "repo_local_path": local_path,
        "collection_name": collection_name,
        "indexed": True,
        "current_phase": "index_done",
    }
```

**Interview talking points:**
- Collection name is derived from the repo URL so the same repo reuses its index across multiple issues
- Uses a **shallow clone** (`depth=1`) for speed — we don't need full git history
- The `{**state, ...}` pattern (spread + override) is the standard LangGraph way to update state — never mutate in place
- If indexing fails, returns `{**state, "error": ...}` which triggers `_should_abort` in graph.py

---

## 7. `app/agents/issue_processor.py` — Phase 2: Issue Classifier

**What it does:** Uses LLM to parse and classify the GitHub issue into a structured JSON: type, component, severity, summary, keywords.

```python
CLASSIFICATION_PROMPT = """
You are a senior software engineer triaging a GitHub issue.
Analyze the issue and respond with ONLY a valid JSON object.

Issue Title: {title}
Issue Body: {body}

JSON schema:
{
  "type": "bug | enhancement | refactor | question | other",
  "component": "affected module/file/class",
  "severity": "critical | high | medium | low",
  "summary": "One-sentence description",
  "keywords": ["list", "of", "terms"]
}
"""

async def issue_processor_node(state: FixoraState) -> FixoraState:
    # Also triggers indexing if not done yet
    if not state.get("indexed"):
        state = await indexer_node(state)

    llm = get_llm_client()
    prompt = CLASSIFICATION_PROMPT.format(title=title, body=body)
    response = await llm.ainvoke(prompt)

    # Strip markdown fences (LLMs sometimes wrap JSON in ```json)
    content = response.content.strip("```json").strip("```").strip()
    classified = json.loads(content)

    return {**state, "classified_issue": classified, "current_phase": "parsed"}
```

**Interview talking points:**
- Structured output via **prompt engineering** — asking LLM to return ONLY valid JSON
- Has a **graceful fallback**: if `json.loads()` fails, returns a default classification with `type="bug"` so the pipeline continues
- The LLM is invoked via `llm.ainvoke(prompt)` — LangChain's async interface
- Agent triggers the indexer if not already done — shows **agent coordination**

---

## 8. `app/agents/localizer.py` — Phase 3: Bug Localizer

**What it does:** Builds a semantic search query from the classified issue, queries ChromaDB for the top-8 most relevant code chunks, then re-ranks and deduplicates them down to 5.

```python
TOP_K = 8        # retrieve 8 chunks from ChromaDB
RERANK_TOP = 5   # keep top 5 after dedup + re-ranking

def _build_query(state: FixoraState) -> str:
    """Combine title + summary + component + keywords into one rich query."""
    classified = state.get("classified_issue", {})
    return f"{title} {summary} {component} {keywords}".strip()

async def localizer_node(state: FixoraState) -> FixoraState:
    query = _build_query(state)
    snippets = query_index(query, collection_name, top_k=TOP_K)

    # De-duplicate: keep best score per file
    seen: dict[str, dict] = {}
    for s in snippets:
        fp = s["file_path"]
        if fp not in seen or s["score"] > seen[fp]["score"]:
            seen[fp] = s

    # Re-rank by score descending, take top RERANK_TOP
    ranked = sorted(seen.values(), key=lambda x: x["score"], reverse=True)[:RERANK_TOP]
    probable_files = [s["file_path"] for s in ranked]

    return {**state, "relevant_snippets": ranked, "probable_bug_files": probable_files}
```

**Interview talking points:**
- This is **RAG (Retrieval-Augmented Generation)** — instead of sending the whole repo to the LLM, we retrieve only the relevant chunks
- The query is semantically enriched: title + AI-generated summary + component name + keywords
- **De-duplication by file path**: if two chunks from the same file are returned, keep only the higher-scoring one — avoids sending duplicate context to the LLM
- The `score` is a **cosine similarity** score from ChromaDB (0.0–1.0)

---

## 9. `app/agents/patcher.py` — Phase 4: Patch Generator

**What it does:** Asks the LLM to generate a minimal **unified diff** fixing the bug, then applies it to the local repo and generates a pytest test file.

```python
PATCH_PROMPT = """
You are an expert software engineer. Fix the bug described below.
Produce a minimal, correct unified diff (git diff format).
Only modify what is necessary. Respond with ONLY the raw diff.
"""

TEST_PROMPT = """
Write a pytest test suite covering:
- The bug scenario (regression test)
- The happy path
- At least one edge case
Respond with ONLY Python test file content.
"""

async def patcher_node(state: FixoraState) -> FixoraState:
    # Step 1: Generate unified diff
    patch_response = await llm.ainvoke(patch_prompt)
    patch_diff = patch_response.content.strip()

    # Step 2: Apply patch using git apply
    if patch_diff.startswith("---"):
        patch_applied = apply_patch(repo_path, patch_diff)

    # Step 3: Generate test code
    test_response = await llm.ainvoke(test_prompt)
    test_code = test_response.content.strip()

    # Step 4: Write test file to repo at tests/fixora/test_issue_N.py
    test_file_path = write_test_file(repo_path, issue_number, test_code)

    return {**state, "patch_diff": patch_diff, "patch_applied": patch_applied,
            "test_code": test_code, "test_file_path": test_file_path}
```

**Interview talking points:**
- Uses two separate LLM calls: one for the **patch** (code fixing), one for the **tests** — separation of concerns
- Validates `patch_diff.startswith("---")` before applying — basic sanity check on LLM output
- `_is_valid_python()` uses Python's `ast.parse()` to validate generated test syntax before writing
- Uses `git apply --check` as a dry-run before the real `git apply` — avoids partial failures

---

## 10. `app/agents/evaluator.py` — Phase 5: Evaluator & PR Creator

**What it does:** Scores the patch using LLM self-evaluation, runs the generated tests with pytest, builds a rich PR description, and creates a **GitHub Pull Request**.

```python
EVAL_PROMPT = """
Score this patch on a scale from 0.0 to 1.0.
Consider:
- Does it directly fix the bug? (+0.4)
- Is the change minimal and safe? (+0.3)
- Is the generated test meaningful? (+0.2)
- Is the diff well-formed? (+0.1)
Respond with ONLY: {"score": <0.0-1.0>, "reasoning": "<one sentence>"}
"""

async def evaluator_node(state: FixoraState) -> FixoraState:
    # LLM self-evaluates the patch quality
    confidence, reasoning = await _score_patch(state)

    # Run generated pytest tests in the local repo
    test_passed = _run_tests(state["test_file_path"], state["repo_local_path"])

    # Build PR body with all context
    pr_body = _build_pr_body(state, confidence, reasoning, test_passed)

    # Create GitHub PR as a draft
    pr_url, pr_number = create_pull_request(
        repo_url=repo_url,
        branch_name=f"fixora/issue-{issue_number}",
        title=f"[Fixora] Fix: {issue_title} (Issue #{issue_number})",
        body=pr_body,
        draft=True,   # ← Always a draft — human must review before merge
    )

    return {**state, "confidence_score": confidence, "test_passed": test_passed,
            "pr_url": pr_url, "pr_number": pr_number, "current_phase": "done"}
```

**Interview talking points:**
- **LLM self-evaluation** — using the same LLM to score its own output is called "LLM-as-a-judge" pattern
- `subprocess.run(["pytest", ...], timeout=60)` — runs tests with a timeout to prevent hanging
- PR is created as a **draft** — intentional safety measure so a human always reviews before merging
- The PR body is auto-generated with structured markdown: issue summary, affected files, test results, confidence score

---

## 11. `app/tools/llm_client.py` — LLM Factory

**What it does:** Provides two clients — a native Groq client for direct streaming, and a LangChain `ChatOpenAI` client for use by agents.

```python
from groq import Groq
from langchain_openai import ChatOpenAI

def get_groq_client():
    """Raw Groq SDK — supports streaming + reasoning_effort."""
    return Groq(api_key=settings.groq_api_key)

def groq_chat(prompt: str, stream: bool = False) -> str:
    client = get_groq_client()
    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        max_completion_tokens=8192,
        reasoning_effort="medium",   # ← Groq-specific reasoning control
        stream=stream,
    )
    if stream:
        for chunk in completion:
            print(chunk.choices[0].delta.content or "", end="", flush=True)

@lru_cache(maxsize=1)
def get_llm_client(temperature=0.1) -> ChatOpenAI:
    """LangChain client — used by all agents via ainvoke()."""
    kwargs = dict(
        model=settings.llm_model,
        api_key=settings.effective_api_key,
        temperature=temperature,
    )
    if settings.effective_base_url:
        kwargs["base_url"] = settings.effective_base_url  # Routes to Groq/DeepSeek
    return ChatOpenAI(**kwargs)
```

**Interview talking points:**
- `@lru_cache(maxsize=1)` — the LangChain client is cached so it's created only once per process
- Groq uses the **OpenAI-compatible API** — by just changing the `base_url`, we use LangChain's ChatOpenAI with Groq's backend
- `reasoning_effort="medium"` is a Groq-specific parameter that controls how much "thinking" the model does (like chain-of-thought)
- Two separate client types: raw Groq SDK (streaming) + LangChain (async .ainvoke for agents)

---

## 12. `app/tools/repo_utils.py` — Git Clone & File Walker

**What it does:** Clones repos to a temp directory, reuses existing clones (with git pull), and walks the repo to list all source files.

```python
_CLONE_BASE = Path(tempfile.gettempdir()) / "fixora_repos"
SUPPORTED_EXTENSIONS = {".py", ".js", ".ts", ".java", ".go", ...}
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", ...}

def clone_repo(repo_url: str, force: bool = False) -> str:
    slug = repo_url.rstrip("/").split("/")[-2:]  # ["owner", "repo"]
    local_path = _CLONE_BASE / "_".join(slug)

    if local_path.exists() and not force:
        # Pull latest instead of re-cloning — much faster
        git.Repo(local_path).remotes.origin.pull()
        return str(local_path)

    git.Repo.clone_from(repo_url, local_path, depth=1)  # shallow clone
    return str(local_path)

def list_source_files(repo_path: str) -> list[str]:
    """Walk repo, return paths with supported extensions, skip noise dirs."""
    for path in root.rglob("*"):
        if path.is_file() and path.suffix in SUPPORTED_EXTENSIONS:
            if not any(skip in path.parts for skip in SKIP_DIRS):
                files.append(str(path))
```

**Interview talking points:**
- `depth=1` shallow clone — downloads only the latest snapshot, not full git history. Much faster for large repos
- **Clone caching**: if the repo was already cloned, just `git pull` instead of re-cloning
- `SKIP_DIRS` prevents indexing `.git`, `node_modules`, etc. — would waste tokens and pollute the vector index
- Uses `gitpython` library (`git.Repo`, `git.Repo.clone_from`) — Pythonic git interface

---

## 13. `app/tools/chunker.py` — Code Splitter

**What it does:** Uses LlamaIndex's `CodeSplitter` to split each source file into 60-line chunks with 15-line overlap, preserving language-aware boundaries.

```python
from llama_index.core.node_parser import CodeSplitter

CHUNK_LINES = 60         # each chunk is ~60 lines
CHUNK_LINES_OVERLAP = 15 # 15-line overlap between adjacent chunks
MAX_CHARS = 4000         # safety cap on chunk size

LANGUAGE_MAP = {".py": "python", ".js": "javascript", ".ts": "typescript", ...}

def chunk_repository(repo_path: str) -> list[dict]:
    for file_path in list_source_files(repo_path):
        language = LANGUAGE_MAP.get(Path(file_path).suffix, "python")

        splitter = CodeSplitter(
            language=language,
            chunk_lines=CHUNK_LINES,
            chunk_lines_overlap=CHUNK_LINES_OVERLAP,
            max_chars=MAX_CHARS,
        )

        raw_doc = Document(text=content, metadata={"file_path": file_path})
        nodes = splitter.get_nodes_from_documents([raw_doc])

        for i, node in enumerate(nodes):
            documents.append({
                "file_path": file_path,
                "start_line": i * (CHUNK_LINES - CHUNK_LINES_OVERLAP),
                "snippet": node.get_content(),
                "language": language,
            })
```

**Interview talking points:**
- `CodeSplitter` is language-aware — it uses **tree-sitter** under the hood to split at logical boundaries (functions, classes) rather than arbitrary line counts
- **15-line overlap** ensures context is not cut off at chunk boundaries — important for bug localization
- Each chunk stores `file_path`, `start_line`, `end_line` — so the patcher knows exactly where to apply the fix
- Returns a `list[dict]` (not LlamaIndex objects) so the interface is clean and testable

---

## 14. `app/tools/vector_store.py` — ChromaDB Integration

**What it does:** Converts code chunks into `TextNode` objects, generates embeddings via OpenAI/Groq, and stores/queries them in ChromaDB using LlamaIndex.

```python
import chromadb
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore

def build_index(documents: list[dict], collection_name: str) -> None:
    """Store code chunks as vector embeddings in ChromaDB."""
    _client, collection = _get_chroma_collection(collection_name)
    vector_store = ChromaVectorStore(chroma_collection=collection)
    embed_model = OpenAIEmbedding(model=settings.embedding_model, ...)

    nodes = [TextNode(text=doc["snippet"], metadata={...}) for doc in documents]
    VectorStoreIndex(nodes=nodes, storage_context=storage_context, embed_model=embed_model)

def query_index(query: str, collection_name: str, top_k: int = 8) -> list[dict]:
    """Semantic search — returns top-k most similar code chunks."""
    index = VectorStoreIndex.from_vector_store(vector_store=vector_store, ...)
    retriever = index.as_retriever(similarity_top_k=top_k)
    nodes_with_scores = retriever.retrieve(query)

    return [{"file_path": ..., "snippet": ..., "score": node_w_score.score} 
            for node_w_score in nodes_with_scores]
```

**Interview talking points:**
- **ChromaDB** is an open-source vector database that runs locally — no cloud account needed
- **Embeddings** are numerical representations of text — similar code snippets have similar vectors (cosine distance)
- `text-embedding-3-small` from OpenAI generates 1536-dimensional vectors for each chunk
- LlamaIndex acts as an abstraction layer — the same code works with different vector stores (Chroma, Pinecone, etc.)
- `get_or_create_collection` is idempotent — safe to call multiple times

---

## 15. `app/tools/code_applicator.py` — Patch Applicator

**What it does:** Applies a unified diff to the local repo using `git apply`, commits on a new branch, and writes the generated test file.

```python
def apply_patch(repo_path: str, patch_diff: str) -> bool:
    """Apply diff using git apply — works cross-platform via Git for Windows."""
    patch_file = Path(repo_path) / ".fixora_patch.diff"
    patch_file.write_text(patch_diff, encoding="utf-8")

    # Dry-run first — verify patch applies cleanly
    result = subprocess.run(["git", "apply", "--check", str(patch_file)], ...)
    if result.returncode == 0:
        subprocess.run(["git", "apply", str(patch_file)], check=True, ...)
        return True
    return False
    # finally: always delete the temp .diff file

def commit_patch(repo_path: str, issue_number: int, branch_name: str) -> bool:
    """Checkout new branch → git add -A → commit → push origin."""
    cmds = [
        ["git", "checkout", "-b", branch_name],
        ["git", "add", "-A"],
        ["git", "commit", "-m", f"fix: automated patch for issue #{issue_number} [Fixora]"],
        ["git", "push", "origin", branch_name],
    ]
    for cmd in cmds:
        subprocess.run(cmd, cwd=repo_path, check=True, ...)

def write_test_file(repo_path: str, issue_number: int, test_code: str) -> str:
    """Write test file to tests/fixora/test_issue_N.py"""
    test_dir = Path(repo_path) / "tests" / "fixora"
    test_dir.mkdir(parents=True, exist_ok=True)
    test_path = test_dir / f"test_issue_{issue_number}.py"
    test_path.write_text(test_code)
    return str(test_path)
```

**Interview talking points:**
- `git apply --check` is a **dry-run** — if it fails, we don't touch the repo at all
- `finally: patch_file.unlink()` — always deletes the temp `.diff` file even if an exception is raised
- Convention-based test path: `tests/fixora/test_issue_{N}.py` — keeps Fixora-generated tests separate from existing tests
- Uses `subprocess` to call `git` directly — more reliable than gitpython for apply/commit/push operations

---

## 16. `app/tools/github_client.py` — GitHub API

**What it does:** Uses **PyGithub** to create PRs and post issue comments programmatically.

```python
from github import Github, GithubException

def _get_github_repo(repo_url: str):
    """Parse clone URL → get PyGithub Repo object."""
    parts = repo_url.rstrip("/").rstrip(".git").split("/")
    owner, repo_name = parts[-2], parts[-1]    # e.g. "owner", "my-repo"
    g = Github(settings.github_token)
    return g.get_repo(f"{owner}/{repo_name}")

def create_pull_request(repo_url, branch_name, title, body, draft=True):
    repo = _get_github_repo(repo_url)

    # Create branch if it doesn't exist yet
    try:
        repo.get_branch(branch_name)
    except GithubException:
        base_sha = repo.get_branch("main").commit.sha
        repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=base_sha)

    pr = repo.create_pull(title=title, body=body, head=branch_name, base="main", draft=draft)
    return pr.html_url, pr.number

def add_issue_comment(repo_url, issue_number, comment):
    repo = _get_github_repo(repo_url)
    repo.get_issue(issue_number).create_comment(comment)
```

**Interview talking points:**
- Uses `PyGithub` library — clean, Pythonic wrapper around GitHub REST API v3
- Branch creation is **idempotent** — catches `GithubException` if branch exists and proceeds
- All PRs are created as **draft** — safety mechanism: Fixora never auto-merges
- `add_issue_comment()` can be used to notify issue reporters that the bot is working on their issue

---

## 🎯 Key Interview Questions & Answers

**Q: Why use LangGraph instead of a simple function call chain?**
> LangGraph gives us a proper state machine with conditional routing. If any agent fails, `_should_abort` routes to END instead of continuing. It's also more observable — you can see which phase failed from `current_phase` and `error` in the state.

**Q: Why RAG instead of just sending the whole codebase to the LLM?**
> Most repos are too large to fit in a context window. RAG (ChromaDB + embeddings) retrieves only the 5 most semantically relevant code chunks — maybe 300 lines total — which is both cheaper and more accurate.

**Q: How do you prevent the webhook from being spoofed?**
> GitHub signs every webhook payload with an HMAC-SHA256 hash of the request body using a shared secret. We verify this signature using `hmac.compare_digest()` which is constant-time (prevents timing attacks).

**Q: Why is the PR always a Draft?**
> Safety. Fixora is an AI — it can be wrong. A draft PR requires a human to explicitly approve and undraft before merging. This is the responsible AI design choice.

**Q: What happens if the LLM returns invalid JSON?**
> In `issue_processor.py`, we have a `try/except json.JSONDecodeError` that falls back to a default classification (`type="bug"`, `severity="medium"`). The pipeline continues degraded rather than crashing.

**Q: Why `@lru_cache` on `get_llm_client()`?**
> Creating an LLM client object is not free — it initializes HTTP connection pools. Caching with `maxsize=1` means we create the client once and reuse it for all 5 agent calls within a single pipeline run.
