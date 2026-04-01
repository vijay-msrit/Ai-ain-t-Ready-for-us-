import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AgentCard from "../components/AgentCard";
import { fetchEvaluate } from "../api/client";

const ChartIcon = () => (
  <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" fill="none" stroke="#FF8C00" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);

const ScoreCard = ({ label, value, color }) => {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div style={{ background: "#141414", border: "1px solid #252525", borderRadius: "10px", padding: "24px 16px", textAlign: "center" }}>
      <p style={{ fontSize: "52px", fontWeight: "900", fontFamily: "monospace", color: "#fff", marginBottom: "8px" }}>{pct}%</p>
      <p style={{ fontSize: "12px", color: "#555", fontWeight: "600" }}>{label}</p>
    </div>
  );
};

export default function Evaluator() {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError]   = useState(null);

  useEffect(() => {
    (async () => {
      setStatus("running");
      try { const r = await fetchEvaluate(); setData(r.data); setStatus("success"); }
      catch (e) { setError(e.message); setStatus("error"); }
    })();
  }, []);

  return (
    <div style={{ padding: "40px", maxWidth: "780px" }}>
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#FF8C00", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
        Step 5 of 5
      </p>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#fff", marginBottom: "4px" }}>Evaluate</h1>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#FF8C00", marginBottom: "20px" }}>&amp; Ship.</h1>
      <p style={{ fontSize: "15px", color: "#777", lineHeight: 1.7, marginBottom: "32px" }}>
        Confidence scores, test results, and automatic PR creation — all in one place.
      </p>

      {/* Score cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <ScoreCard label="Fix Confidence"  value={data?.fix_confidence_score} />
        <ScoreCard label="Test Pass Rate"  value={data?.test_pass_rate} />
        <ScoreCard label="Code Quality"    value={data?.code_quality_score} />
      </div>

      <AgentCard title="Evaluator Agent" description="Pull request summary"
        status={status} iconBg="#22C55E" icon={<ChartIcon />}>

        {status === "running" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#777", padding: "16px 0" }}>
            <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="#FF8C00" strokeWidth="4" opacity="0.25" />
              <path fill="#FF8C00" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Running evaluation suite...
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", color: "#EF4444", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: "#1A1A1A", border: "1px solid #252525", borderRadius: "8px", overflow: "hidden" }}>
              {data.pr_link && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderBottom: "1px solid #252525" }}>
                  <LinkIcon />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "11px", color: "#555", marginBottom: "3px" }}>PR Link</p>
                    <a href={data.pr_link} target="_blank" rel="noreferrer"
                      style={{ fontSize: "13px", color: "#FF8C00", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {data.pr_link}
                    </a>
                  </div>
                </div>
              )}
              {data.branch_name && (
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #252525" }}>
                  <p style={{ fontSize: "11px", color: "#555", marginBottom: "3px" }}>Branch</p>
                  <span style={{ fontFamily: "monospace", fontSize: "13px", color: "#ddd" }}>{data.branch_name}</span>
                </div>
              )}
              {data.commit_message && (
                <div style={{ padding: "12px 16px" }}>
                  <p style={{ fontSize: "11px", color: "#555", marginBottom: "3px" }}>Commit Message</p>
                  <span style={{ fontFamily: "monospace", fontSize: "13px", color: "#ddd", lineHeight: 1.5 }}>{data.commit_message}</span>
                </div>
              )}
            </div>

            {status === "success" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ marginTop: "16px", background: "#0A2200", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: "800", color: "#22C55E" }}>Pull Request Created Successfully.</p>
                  <p style={{ fontSize: "12px", color: "#22C55E", opacity: 0.6, marginTop: "2px" }}>Fixora completed the full 5-agent pipeline and submitted your fix for review.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AgentCard>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
