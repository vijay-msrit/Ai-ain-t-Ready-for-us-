# 🔄 Fixora — Core Workflow Explained

Step-by-step breakdown of the 5 core files and how they connect...

---

## 📦 The 5 Core Files & Their Roles

| File | Role | Layer |
|------|------|-------|
| `config.py` | Loads all `.env` settings — API keys, hosts, model names | Foundation |
| `state.py` | Defines shared data contract (`FixoraState`) passed between agents | Data Schema |
| `main.py` | Starts the FastAPI server, registers routes | Entry Point |
| `webhook.py` | Receives GitHub events, validates them, triggers pipeline | Gateway |
| `graph.py` | Wires 5 agents into a sequential pipeline with error routing | Orchestrator |

---

## 🗺️ Full System Flow

```mermaid
flowchart TD
    A([".env file"]) -->|"loaded at startup"| B["config.py\n(Settings object)"]
    B -->|"settings injected everywhere"| C["main.py\n(FastAPI App)"]
    C -->|"mounts router"| D["webhook.py\n(POST /webhook/github)"]
    D -->|"validates + extracts payload"| E["Builds FixoraState\n(from state.py)"]
    E -->|"background_tasks.add_task()"| F["graph.py\nrun_pipeline()"]
    F -->|"ainvoke(state)"| G["LangGraph Pipeline\n5 Agents in sequence"]
    G -->|"final FixoraState"| H(["GitHub PR Created ✅"])
```

---

## Step 1 — `config.py` (Foundation)

**Loads when:** Python imports any module that does `from app.config import settings`

**What it does:** Reads `.env` file into typed Python fields using Pydantic.

```mermaid
flowchart LR
    A[".env file"] --> B["class Settings(BaseSettings)"]
    B --> C["settings.groq_api_key\nsettings.github_token\nsettings.chroma_host\netc."]
    C --> D["effective_api_key\n(computed property)"]
    C --> E["effective_base_url\n(computed property)"]
    D --> F{"LLM_PROVIDER?"}
    F -->|groq| G["gsk_... key + Groq URL"]
    F -->|openai| H["sk_... key + OpenAI URL"]
    F -->|deepseek| I["ds_... key + DeepSeek URL"]
```

**Key design:** Computed properties mean one place to control which LLM is used — change `LLM_PROVIDER` in `.env` and everything updates automatically.

---

## Step 2 — `state.py` (Shared Memory)

**Used by:** Every agent as their input AND output contract.

**What it does:** Defines `FixoraState` — a `TypedDict` (typed dictionary) that flows through the entire pipeline. Each agent reads some fields and writes new ones.

```mermaid
flowchart TD
    S["FixoraState (TypedDict)"]
    S --> A["📥 Input\nrepo_url, issue_title\nissue_body, issue_number"]
    S --> B["🏗️ Phase 1 - Index\ncollection_name, indexed"]
    S --> C["🧠 Phase 2 - Classify\nclassified_issue dict\n{type, severity, keywords}"]
    S --> D["🔍 Phase 3 - Locate\nrelevant_snippets\nprobable_bug_files"]
    S --> E["🔧 Phase 4 - Patch\npatch_diff, test_code\ntest_file_path"]
    S --> F["✅ Phase 5 - Evaluate\nconfidence_score\npr_url, pr_number"]
    S --> G["🚦 Control\nerror, current_phase"]
```

**Update pattern used by every agent:**
```python
return {**state, "new_field": value}   # spread existing + add new fields
```

---

## Step 3 — `main.py` (Entry Point)

**Runs when:** `python -m app.main` is executed.

**What it does:** Creates the FastAPI app, configures middleware, and registers the webhook router.

```mermaid
flowchart TD
    A["python -m app.main"] --> B["uvicorn starts server"]
    B --> C["FastAPI app created"]
    C --> D["lifespan() context manager\nlog startup message"]
    D --> E["CORSMiddleware added\nallow_origins=all"]
    E --> F["webhook_router mounted\nat /webhook prefix"]
    F --> G{"Routes available"}
    G --> H["GET /\nGET /health"]
    G --> I["POST /webhook/github\nPOST /webhook/trigger"]
    H --> J(["Server ready on\n0.0.0.0:8000"])
    I --> J
```

---

## Step 4 — `webhook.py` (Event Gateway)

**Called when:** GitHub sends a POST to `/webhook/github` (or you POST to `/webhook/trigger`).

**What it does:** The security gate + pipeline trigger.

```mermaid
flowchart TD
    A["GitHub sends\nPOST /webhook/github"] --> B["Read raw request body"]
    B --> C{"Verify HMAC-SHA256\nSignature"}
    C -->|"❌ Invalid"| D["HTTP 401\nUnauthorized"]
    C -->|"✅ Valid"| E{"x-github-event\n== 'issues'?"}
    E -->|"No (push/PR/etc)"| F["Return: ignored"]
    E -->|"Yes"| G{"action ==\n'opened' or 'reopened'?"}
    G -->|"No (edited/labeled)"| H["Return: ignored"]
    G -->|"Yes"| I["Build initial FixoraState\nfrom webhook payload"]
    I --> J["background_tasks.add_task()\nrun_pipeline(state)"]
    J --> K["Return HTTP 200\nstatus: accepted"]
    K --> L(["Pipeline runs async\nin background 🚀"])
```

**Manual test trigger flow:**
```mermaid
flowchart LR
    A["POST /webhook/trigger\n{repo_url, issue_title...}"] --> B["Skip signature check"]
    B --> C["Build FixoraState"]
    C --> D["background_tasks.add_task()"]
    D --> E(["Pipeline runs ✅"])
```

---

## Step 5 — `graph.py` (Orchestrator)

**Called when:** `run_pipeline(initial_state)` is invoked by `webhook.py`.

**What it does:** Runs the 5 agents in sequence. After each agent, checks if an error occurred.

```mermaid
flowchart TD
    A["run_pipeline(initial_state)"] --> B["_compiled_graph.ainvoke(state)"]
    B --> C["🔵 parse\nissue_processor_node"]
    C --> D{"_should_abort?\nstate.error exists?"}
    D -->|"❌ error"| END1([END])
    D -->|"✅ ok"| E["🔵 locate\nlocalizer_node"]
    E --> F{"_should_abort?"}
    F -->|"❌ error"| END2([END])
    F -->|"✅ ok"| G["🔵 patch\npatcher_node"]
    G --> H{"_should_abort?"}
    H -->|"❌ error"| END3([END])
    H -->|"✅ ok"| I["🔵 evaluate\nevaluator_node"]
    I --> END4(["END\nPR Created ✅"])
```

> **Note:** `indexer_node` is NOT a graph node — it's called **from inside** `issue_processor_node` if `state['indexed']` is False.

---

## 🔗 How All 5 Files Connect Together

```mermaid
sequenceDiagram
    participant ENV as .env
    participant CFG as config.py
    participant MAIN as main.py
    participant WH as webhook.py
    participant ST as state.py
    participant GR as graph.py

    ENV-->>CFG: loaded at import time
    CFG-->>MAIN: settings injected
    MAIN->>MAIN: FastAPI app created
    MAIN->>WH: router mounted at /webhook

    Note over WH: GitHub sends issue event
    WH->>WH: verify HMAC signature
    WH->>ST: create FixoraState dict
    WH->>GR: background_tasks.add_task(run_pipeline, state)

    GR->>GR: ainvoke(state) through 5 agents
    GR-->>ST: state updated after each agent
    GR-->>WH: final_state returned (async)

    Note over GR: PR created on GitHub ✅
```

---

## 🧩 Single-Line Summary of Each File

| File | One-liner |
|------|-----------|
| `config.py` | **"Read `.env`, expose as typed Python properties"** |
| `state.py` | **"The baton passed between all agents"** |
| `main.py` | **"Boot the server, plug in routes"** |
| `webhook.py` | **"Verify GitHub events, fire pipeline in background"** |
| `graph.py` | **"Chain 5 agents with error checkpoints"** |
