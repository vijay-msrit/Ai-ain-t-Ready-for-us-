import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AgentCard from "../components/AgentCard";
import { fetchPatch } from "../api/client";

const WrenchIcon = () => (
  <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>
);

function DiffLine({ line }) {
  if (line.startsWith("+") && !line.startsWith("+++"))
    return <div style={{ display: "flex", gap: "10px", background: "rgba(34,197,94,0.15)", padding: "1px 8px", borderRadius: "3px" }}>
      <span style={{ color: "#4ADE80", fontWeight: "700", userSelect: "none", width: "12px", flexShrink: 0 }}>+</span>
      <span style={{ color: "#E5E7EB" }}>{line.slice(1)}</span>
    </div>;
  if (line.startsWith("-") && !line.startsWith("---"))
    return <div style={{ display: "flex", gap: "10px", background: "rgba(239,68,68,0.15)", padding: "1px 8px", borderRadius: "3px" }}>
      <span style={{ color: "#F87171", fontWeight: "700", userSelect: "none", width: "12px", flexShrink: 0 }}>-</span>
      <span style={{ color: "#9CA3AF", textDecoration: "line-through" }}>{line.slice(1)}</span>
    </div>;
  if (line.startsWith("@@"))
    return <div style={{ padding: "2px 8px" }}><span style={{ color: "#FBBF24", fontSize: "11px", fontFamily: "monospace" }}>{line}</span></div>;
  if (line.startsWith("---") || line.startsWith("+++"))
    return <div style={{ padding: "1px 8px" }}><span style={{ color: "#6B7280", fontSize: "11px", fontFamily: "monospace" }}>{line}</span></div>;
  return <div style={{ padding: "1px 8px" }}>
    <span style={{ color: "#4B5563", userSelect: "none", width: "12px", display: "inline-block" }}> </span>
    <span style={{ color: "#D1D5DB" }}>{line.slice(1) || line}</span>
  </div>;
}

export default function Patcher() {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError]   = useState(null);

  useEffect(() => {
    (async () => {
      setStatus("running");
      try { const r = await fetchPatch(); setData(r.data); setStatus("success"); }
      catch (e) { setError(e.message); setStatus("error"); }
    })();
  }, []);

  const lines        = data?.diff ? data.diff.split("\n") : [];
  const addedCount   = lines.filter(l => l.startsWith("+") && !l.startsWith("+++")).length;
  const removedCount = lines.filter(l => l.startsWith("-") && !l.startsWith("---")).length;

  return (
    <div style={{ padding: "40px", maxWidth: "780px" }}>
      <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-yellow)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
        Step 4 of 5
      </p>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "var(--text-main)", marginBottom: "4px" }}>Generate</h1>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "var(--accent-yellow)", marginBottom: "20px" }}>the Fix.</h1>
      <p style={{ fontSize: "15px", color: "var(--text-muted-dark)", lineHeight: 1.7, marginBottom: "32px" }}>
        AI writes a precise patch diff to resolve the identified bug with minimal footprint.
      </p>

      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          {[
            { label: "Files Changed", val: data.files_changed ?? "—", color: "var(--text-main)" },
            { label: "Lines Added",   val: `+${addedCount}`,           color: "var(--accent-green)" },
            { label: "Lines Removed", val: `-${removedCount}`,         color: "var(--accent-red)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
              <p style={{ fontSize: "36px", fontWeight: "900", fontFamily: "monospace", color: s.color, marginBottom: "6px" }}>{s.val}</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted-dark)", fontWeight: "600" }}>{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      <AgentCard title="Patch Generator Agent" description="Unified diff output"
        status={status} iconBg="#3B82F6" icon={<WrenchIcon />}>

        {status === "running" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted-dark)", padding: "16px 0" }}>
            <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="var(--accent-yellow)" strokeWidth="4" opacity="0.25" />
              <path fill="var(--accent-yellow)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating patch with AI...
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", color: "var(--accent-red)", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {data?.diff && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: "#050505", border: "1px solid #2A2A2A", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111111", padding: "8px 14px", borderBottom: "1px solid #2A2A2A" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }} />
                </div>
                <span style={{ fontSize: "11px", color: "#6B7280", fontFamily: "monospace" }}>patch.diff</span>
              </div>
              <div style={{ padding: "10px 0", fontFamily: "monospace", fontSize: "12px", maxHeight: "480px", overflowY: "auto", overflowX: "auto", lineHeight: 1.6, color: "#E5E7EB" }}>
                {lines.map((line, i) => <DiffLine key={i} line={line} />)}
              </div>
            </div>
          </motion.div>
        )}
      </AgentCard>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
