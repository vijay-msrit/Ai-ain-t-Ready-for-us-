import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AgentCard from "../components/AgentCard";
import { indexRepo } from "../api/client";

const LOGS = [
  "Connecting to GitHub repository...",
  "Cloning repository to local cache...",
  "Scanning source files...",
  "Chunking code with LlamaIndex CodeSplitter...",
  "Generating embeddings...",
  "Storing vectors in ChromaDB...",
  "Classifying issue with AI...",
  "Localizing bug in codebase...",
  "Generating patch diff...",
  "Evaluating patch quality...",
  "Pipeline complete ✓",
];

const GithubIcon = () => (
  <svg width="15" height="15" fill="#666" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const ZapIcon = () => (
  <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const inputStyle = {
  width: "100%", padding: "11px 14px", background: "#1A1A1A",
  border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff",
  fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

export default function Indexer() {
  const [repoUrl, setRepoUrl]         = useState("");
  const [issueNumber, setIssueNumber] = useState("1");
  const [status, setStatus]           = useState("idle");
  const [logs, setLogs]               = useState([]);
  const [error, setError]             = useState(null);
  const navigate = useNavigate();

  const isValidUrl = repoUrl.trim().startsWith("https://github.com/");
  const canSubmit  = isValidUrl && issueNumber && status !== "running";

  const handleRun = async () => {
    if (!canSubmit) return;
    setStatus("running"); setLogs([]); setError(null);
    LOGS.forEach((msg, i) => setTimeout(() => setLogs(p => [...p, msg]), i * 1600));
    try {
      await indexRepo({ repo_url: repoUrl.trim(), issue_number: parseInt(issueNumber, 10) || 1 });
      setStatus("success");
      setTimeout(() => navigate("/issue"), 800);
    } catch (err) {
      setStatus("error");
      setError(err.message);
      setLogs(p => [...p, `✗ ${err.message}`]);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "680px" }}>
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#FF8C00", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
        Step 1 of 5
      </p>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#fff", marginBottom: "4px" }}>Start the</h1>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#FF8C00", marginBottom: "20px" }}>Pipeline.</h1>
      <p style={{ fontSize: "15px", color: "#777", lineHeight: 1.7, marginBottom: "32px" }}>
        Provide a GitHub repo and issue details. Fixora will index the code, locate the bug, generate a patch, and open a PR — automatically.
      </p>

      <AgentCard title="Indexer Agent" description="Run the full 5-agent pipeline" status={status}
        iconBg="#6366F1" icon={<ZapIcon />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Repo URL */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#aaa", display: "block", marginBottom: "8px" }}>
              GitHub Repository URL
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}>
                <GithubIcon />
              </div>
              <input type="url" value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                disabled={status === "running"}
                style={{ ...inputStyle, paddingLeft: "38px" }} />
            </div>
            {repoUrl && !isValidUrl && (
              <p style={{ fontSize: "11px", color: "#EF4444", marginTop: "6px" }}>Must start with https://github.com/</p>
            )}
          </div>

          {/* Issue Number */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#aaa" }}>Issue Number</label>
              <span style={{ fontSize: "11px", color: "#555" }}>(from GitHub Issues tab)</span>
            </div>
            <input type="number" min="1" value={issueNumber}
              onChange={e => setIssueNumber(e.target.value)}
              disabled={status === "running"}
              style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", color: "#EF4444", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <button onClick={handleRun} disabled={!canSubmit} className="btn-run" style={{
            width: "100%", padding: "14px",
            background: canSubmit ? "#7A5800" : "#1A1A1A",
            border: "none", borderRadius: "8px",
            color: canSubmit ? "#fff" : "#444",
            fontSize: "15px", fontWeight: "700",
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}>
            {status === "running" ? (
              <><svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
              </svg>Running Pipeline...</>
            ) : status === "success" ? "✓ Done — Loading Results" : (
              <><span style={{ fontSize: "16px" }}>▷</span> Run Fixora Pipeline</>
            )}
          </button>
        </div>
      </AgentCard>

      <AnimatePresence>
        {logs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: "#141414", border: "1px solid #252525", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: status === "running" ? "#FF8C00" : "#22C55E" }} />
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>Pipeline Logs</span>
              {status === "running" && <span style={{ fontSize: "11px", color: "#555", marginLeft: "auto" }}>takes 1–3 min</span>}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "12px", maxHeight: "180px", overflowY: "auto" }}>
              {logs.map((log, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", padding: "2px 0", color: log.startsWith("✗") ? "#EF4444" : "#aaa" }}>
                  <span style={{ color: "#FF8C00" }}>›</span>{log}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
