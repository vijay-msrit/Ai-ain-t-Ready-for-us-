import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AgentCard from "../components/AgentCard";
import { fetchIssue } from "../api/client";

const SEV = {
  critical: { bg: "rgba(239,68,68,0.12)",  color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" },
  high:     { bg: "rgba(249,115,22,0.12)", color: "#F97316", border: "1px solid rgba(249,115,22,0.3)" },
  medium:   { bg: "rgba(255,140,0,0.12)",  color: "#FF8C00", border: "1px solid rgba(255,140,0,0.3)" },
  low:      { bg: "rgba(34,197,94,0.12)",  color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" },
};

const BugIcon = () => (
  <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const Row = ({ label, value }) => (
  <div style={{ display: "flex", gap: "16px", padding: "10px 0", borderBottom: "1px solid #252525" }}>
    <span style={{ fontSize: "13px", color: "#555", width: "110px", flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: "13px", color: "#ddd", fontWeight: "500" }}>{value}</span>
  </div>
);

const Badge = ({ label, style }) => (
  <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "6px", ...style }}>{label}</span>
);

export default function IssueProcessor() {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError]   = useState(null);

  useEffect(() => {
    (async () => {
      setStatus("running");
      try { const r = await fetchIssue(); setData(r.data); setStatus("success"); }
      catch (e) { setError(e.message); setStatus("error"); }
    })();
  }, []);

  const sev = SEV[(data?.severity || "medium").toLowerCase()] || SEV.medium;

  return (
    <div style={{ padding: "40px", maxWidth: "680px" }}>
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#FF8C00", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
        Step 2 of 5
      </p>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#fff", marginBottom: "4px" }}>Understand</h1>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#FF8C00", marginBottom: "20px" }}>the Issue.</h1>
      <p style={{ fontSize: "15px", color: "#777", lineHeight: 1.7, marginBottom: "32px" }}>
        AI classifies the GitHub issue — extracting type, severity, component, and steps to reproduce.
      </p>

      <AgentCard title="Issue Processor Agent" description="AI-structured issue breakdown"
        status={status} iconBg="#FF8C00" icon={<BugIcon />}>

        {status === "running" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#777", padding: "16px 0" }}>
            <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="#FF8C00" strokeWidth="4" opacity="0.25" />
              <path fill="#FF8C00" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Classifying issue with AI...
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", color: "#EF4444", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#1A1A1A", border: "1px solid #252525", borderRadius: "8px", padding: "14px" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#FF8C00", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Issue Title</p>
              <p style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>{data.title}</p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <Badge label={data.type} style={{ background: "rgba(99,102,241,0.12)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.3)" }} />
              <Badge label={data.component} style={{ background: "#1A1A1A", color: "#777", border: "1px solid #2A2A2A" }} />
              <Badge label={`${data.severity} Severity`} style={{ background: sev.bg, color: sev.color, border: sev.border }} />
            </div>

            <div style={{ background: "#1A1A1A", border: "1px solid #252525", borderRadius: "8px", padding: "14px" }}>
              <Row label="Type"      value={data.type} />
              <Row label="Component" value={data.component} />
              <div style={{ display: "flex", gap: "16px", padding: "10px 0" }}>
                <span style={{ fontSize: "13px", color: "#555", width: "110px", flexShrink: 0 }}>Severity</span>
                <span style={{ fontSize: "13px", color: sev.color, fontWeight: "600" }}>{data.severity}</span>
              </div>
            </div>

            {data.summary && (
              <div style={{ background: "#1A1A1A", border: "1px solid #252525", borderRadius: "8px", padding: "14px" }}>
                <p style={{ fontSize: "10px", fontWeight: "700", color: "#FF8C00", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Summary</p>
                <p style={{ fontSize: "13px", color: "#bbb", lineHeight: 1.6 }}>{data.summary}</p>
              </div>
            )}

            {data.keywords?.length > 0 && (
              <div>
                <p style={{ fontSize: "10px", fontWeight: "700", color: "#FF8C00", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Keywords</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {data.keywords.map(k => (
                    <span key={k} style={{ fontFamily: "monospace", fontSize: "12px", background: "#1A1A1A", border: "1px solid #252525", color: "#777", padding: "3px 10px", borderRadius: "4px" }}>{k}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AgentCard>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
