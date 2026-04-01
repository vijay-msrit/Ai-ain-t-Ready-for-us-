import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AgentCard from "../components/AgentCard";
import { fetchLocalize } from "../api/client";

const formatPath = (path) => {
  if (!path) return "";
  const parts = path.split(/[\\/]/);
  // Show only the last 3 folders/files instead of full absolute C:\ path
  return parts.length > 2 ? parts.slice(-3).join("/") : path;
};

const TargetIcon = () => (
  <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const FileIcon = () => (
  <svg width="14" height="14" fill="none" stroke="#777" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);

const SnippetItem = ({ s }) => {
  const pct = s.score !== undefined ? Math.round(s.score * 100) : null;
  const scoreColor = pct >= 80 ? "#22C55E" : pct >= 60 ? "#FF8C00" : "#EF4444";
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ background: "#141414", border: "1px solid #252525", borderRadius: "10px", overflow: "hidden" }}>
      <div onClick={() => setCollapsed(c => !c)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer", background: "#1A1A1A" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <FileIcon />
          <span title={s.file_path} style={{ fontFamily: "monospace", fontSize: "12px", color: "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatPath(s.file_path)}</span>
          <span style={{ fontSize: "11px", color: "#555", flexShrink: 0 }}>L{s.start_line}–{s.end_line}</span>
        </div>
        {pct !== null && <span style={{ fontSize: "12px", fontWeight: "700", fontFamily: "monospace", color: scoreColor, marginLeft: "8px", flexShrink: 0 }}>{pct}%</span>}
      </div>
      {!collapsed && (
        <pre style={{ fontFamily: "monospace", fontSize: "12px", color: "#aaa", padding: "12px 14px", overflowX: "auto", overflowY: "auto", maxHeight: "350px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {s.snippet.replace(/\\n/g, '\n').replace(/\\t/g, '  ')}
        </pre>
      )}
    </div>
  );
};

export default function Localizer() {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError]   = useState(null);

  useEffect(() => {
    (async () => {
      setStatus("running");
      try { const r = await fetchLocalize(); setData(r.data); setStatus("success"); }
      catch (e) { setError(e.message); setStatus("error"); }
    })();
  }, []);

  return (
    <div style={{ padding: "40px", maxWidth: "700px" }}>
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#FF8C00", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
        Step 3 of 5
      </p>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#fff", marginBottom: "4px" }}>Find the</h1>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#FF8C00", marginBottom: "20px" }}>Bug.</h1>
      <p style={{ fontSize: "15px", color: "#777", lineHeight: 1.7, marginBottom: "32px" }}>
        Semantic vector search through your codebase pinpoints the most relevant files and snippets.
      </p>

      <AgentCard title="Probable Bug Files" description="Ranked by semantic similarity score"
        status={status} iconBg="#EC4899" icon={<TargetIcon />}>

        {status === "running" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#777", padding: "16px 0" }}>
            <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="#FF8C00" strokeWidth="4" opacity="0.25" />
              <path fill="#FF8C00" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Querying ChromaDB vector index...
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", color: "#EF4444", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {data?.probable_bug_files && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {data.probable_bug_files.map((file, i) => (
              <motion.div key={file} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{ display: "flex", alignItems: "center", gap: "10px", background: "#1A1A1A", border: "1px solid #252525", borderRadius: "8px", padding: "10px 14px", minWidth: 0 }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(255,140,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", fontWeight: "800", color: "#FF8C00" }}>
                  {i + 1}
                </span>
                <FileIcon />
                <span title={file} style={{ fontFamily: "monospace", fontSize: "13px", color: "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{formatPath(file)}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AgentCard>

      {data?.relevant_snippets?.length > 0 && (() => {
        const uniqueSnippets = data.relevant_snippets.filter((s, i, arr) => 
          arr.findIndex(t => t.file_path === s.file_path && t.start_line === s.start_line) === i
        );
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>Relevant Snippets</h3>
              <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,140,0,0.12)", color: "#FF8C00", border: "1px solid rgba(255,140,0,0.3)" }}>
                {uniqueSnippets.length} found
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {uniqueSnippets.map((s, i) => (
                <SnippetItem key={i} s={s} />
              ))}
            </div>
          </motion.div>
        );
      })()}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
