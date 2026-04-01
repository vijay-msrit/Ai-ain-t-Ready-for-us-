import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import AgentCard from "../components/AgentCard";
import { indexRepo } from "../api/client";

const LOGS = [
  "Connecting to GitHub repository...",
  "Cloning repository to local cache...",
  "Scanning source files...",
  "Chunking code with LlamaIndex CodeSplitter...",
  "Generating OpenAI embeddings...",
  "Storing vectors in ChromaDB...",
  "Running issue processor agent...",
  "Localizing bug in codebase...",
  "Generating patch diff...",
  "Evaluating patch quality...",
  "Pipeline complete ✓",
];

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-muted text-sm font-semibold">{label}</label>
        {hint && <span className="text-muted/50 text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function Indexer() {
  const [repoUrl, setRepoUrl]         = useState("");
  const [issueNumber, setIssueNumber] = useState("1");
  const [issueTitle, setIssueTitle]   = useState("");
  const [issueBody, setIssueBody]     = useState("");
  const [status, setStatus]           = useState("idle");
  const [logs, setLogs]               = useState([]);
  const [error, setError]             = useState(null);
  const navigate = useNavigate();

  const isValidUrl = repoUrl.trim().startsWith("https://github.com/");
  const canSubmit  = isValidUrl && issueTitle.trim() && issueBody.trim() && status !== "running";

  const handleRun = async () => {
    if (!canSubmit) return;
    setStatus("running"); setLogs([]); setError(null);

    // stream fake progress logs while the pipeline runs
    LOGS.forEach((msg, i) =>
      setTimeout(() => setLogs((p) => [...p, msg]), i * 1800)
    );

    try {
      await indexRepo({
        repo_url:     repoUrl.trim(),
        issue_number: parseInt(issueNumber, 10) || 1,
        issue_title:  issueTitle.trim(),
        issue_body:   issueBody.trim(),
      });
      setStatus("success");
      setTimeout(() => navigate("/issue"), 900);
    } catch (err) {
      setStatus("error");
      setError(err.message);
      setLogs((p) => [...p, `✗ ${err.message}`]);
    }
  };

  const inputCls =
    "w-full bg-navy border border-navy-border rounded-2xl px-4 py-3 " +
    "text-white placeholder-muted/50 text-sm " +
    "focus:outline-none focus:border-yellow focus:ring-1 focus:ring-yellow/30 " +
    "transition-all duration-200 disabled:opacity-50";

  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">

        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-light border-b border-navy-border px-10 py-14">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-yellow/8 blur-3xl pointer-events-none" />
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-2xl">
            <p className="eyebrow">Step 1 of 5</p>
            <h1 className="text-5xl font-black text-white leading-[1.08] tracking-tight">
              Start the<br />
              <span className="text-yellow">Pipeline.</span>
            </h1>
            <p className="text-muted text-base mt-4 leading-relaxed">
              Provide a GitHub repo and issue details. Fixora will index the code,
              locate the bug, generate a patch, and open a PR — automatically.
            </p>
          </motion.div>
        </section>

        <div className="flex-1 p-10 space-y-6 max-w-2xl">
          <AgentCard title="Indexer Agent" description="Run the full 5-agent pipeline" status={status} icon="⚡">
            <div className="space-y-5">

              {/* Repo URL */}
              <Field label="GitHub Repository URL">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-muted" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    disabled={status === "running"}
                    className={`${inputCls} pl-11`}
                  />
                </div>
                {repoUrl && !isValidUrl && (
                  <p className="text-danger text-xs mt-1.5">Must start with https://github.com/</p>
                )}
              </Field>

              {/* Issue Number */}
              <Field label="Issue Number" hint="from GitHub Issues tab">
                <input
                  type="number"
                  min="1"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  placeholder="1"
                  disabled={status === "running"}
                  className={inputCls}
                />
              </Field>

              {/* Issue Title */}
              <Field label="Issue Title">
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="e.g. Division by zero in calculate() function"
                  disabled={status === "running"}
                  className={inputCls}
                />
              </Field>

              {/* Issue Body */}
              <Field label="Issue Description">
                <textarea
                  value={issueBody}
                  onChange={(e) => setIssueBody(e.target.value)}
                  placeholder="Describe the bug — steps to reproduce, expected vs actual behavior, error messages..."
                  disabled={status === "running"}
                  rows={5}
                  className={`${inputCls} resize-none`}
                />
              </Field>

              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 text-danger text-sm">
                  {error}
                </div>
              )}

              <button onClick={handleRun} disabled={!canSubmit} className="btn-yellow w-full">
                {status === "running" ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running Pipeline...
                  </>
                ) : status === "success" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Done — Loading Results
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Run Fixora Pipeline
                  </>
                )}
              </button>
            </div>
          </AgentCard>

          {/* Live logs */}
          <AnimatePresence>
            {logs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="card-dark p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full ${status === "running" ? "bg-yellow animate-pulse" : "bg-success"}`} />
                  <h3 className="text-white font-bold text-sm">Pipeline Logs</h3>
                  {status === "running" && (
                    <span className="text-muted text-xs ml-auto">takes 1–3 min</span>
                  )}
                </div>
                <div className="code-dark space-y-1.5 max-h-52 overflow-y-auto">
                  {logs.map((log, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-2 text-xs ${log.startsWith("✗") ? "text-danger" : "text-slate-300"}`}>
                      <span className="text-yellow shrink-0">›</span>{log}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
