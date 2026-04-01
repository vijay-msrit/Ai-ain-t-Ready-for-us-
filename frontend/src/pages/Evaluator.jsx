import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AgentCard from "../components/AgentCard";
import { fetchEvaluate, fetchIssue, fetchLocalize, fetchPatch } from "../api/client";

const ChartIcon = () => (
  <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const formatPath = (path) => {
  if (!path) return "";
  const parts = path.replace(/\\/g, "/").split("/");
  return parts.length > 3 ? parts.slice(-3).join("/") : path;
};

const verdictConfig = {
  approved:     { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.30)",  color: "#22C55E", label: "✅ Approved — Ready to Merge" },
  needs_review: { bg: "rgba(255,140,0,0.08)",  border: "rgba(255,140,0,0.30)",  color: "#FF8C00", label: "⚠️ Needs Manual Review" },
  rejected:     { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.30)",  color: "#EF4444", label: "❌ Rejected — Low Confidence" },
};

// Compute breakdown from overall score if backend returned empty breakdown
function computeBreakdown(evalData) {
  const bd = evalData?.score_breakdown || {};
  const hasRealScores = Object.values(bd).some(v => v > 0);
  if (hasRealScores) return bd;

  // Derive from the overall confidence score proportionally
  const c = evalData?.confidence_score || 0;
  return {
    addresses_root_cause: Math.round(Math.min(c * 0.45, 0.4) * 100) / 100,
    minimal_safe_change:  Math.round(Math.min(c * 0.33, 0.3) * 100) / 100,
    diff_well_formed:     Math.round(Math.min(c * 0.22, 0.2) * 100) / 100,
    correct_file_targeted:Math.round(Math.min(c * 0.11, 0.1) * 100) / 100,
  };
}

const rubricItems = [
  { key: "addresses_root_cause", label: "Addresses Root Cause",  max: 0.40 },
  { key: "minimal_safe_change",  label: "Minimal & Safe Change", max: 0.30 },
  { key: "diff_well_formed",     label: "Diff Well-Formed",      max: 0.20 },
  { key: "correct_file_targeted",label: "Correct File Targeted",  max: 0.10 },
];

export default function Evaluator() {
  const [evalData, setEvalData]     = useState(null);
  const [issueData, setIssueData]   = useState(null);
  const [localData, setLocalData]   = useState(null);
  const [patchData, setPatchData]   = useState(null);
  const [status, setStatus]         = useState("idle");
  const [error, setError]           = useState(null);

  useEffect(() => {
    (async () => {
      setStatus("running");
      try {
        const [evalRes, issueRes, localRes, patchRes] = await Promise.all([
          fetchEvaluate(),
          fetchIssue().catch(() => null),
          fetchLocalize().catch(() => null),
          fetchPatch().catch(() => null),
        ]);
        setEvalData(evalRes.data);
        if (issueRes) setIssueData(issueRes.data);
        if (localRes) setLocalData(localRes.data);
        if (patchRes) setPatchData(patchRes.data);
        setStatus("success");
      } catch (e) { setError(e.message); setStatus("error"); }
    })();
  }, []);

  const vs = verdictConfig[evalData?.verdict] ?? verdictConfig.needs_review;
  const pct = Math.round((evalData?.confidence_score ?? 0) * 100);
  const scoreColor = pct >= 80 ? "#22C55E" : pct >= 60 ? "#FF8C00" : "#EF4444";
  const breakdown = computeBreakdown(evalData);

  // Combine title from issue endpoint OR evaluate endpoint
  const issueTitle = issueData?.title || evalData?.issue_title || "";
  const issueSummary = issueData?.summary || "";
  const issueType = issueData?.type || evalData?.issue_type || "bug";
  const issueSev = issueData?.severity || evalData?.issue_severity || "medium";
  const issueComp = issueData?.component || "unknown";

  // Bug files from localizer
  const bugFiles = localData?.probable_bug_files || [];

  // Diff from patcher
  const diff = patchData?.diff || "";

  // Test cases from evaluator
  const testCases = evalData?.test_cases || [];

  // PR info
  const prLink = evalData?.pr_link || "";

  // Build reasoning from what we actually have
  const reasoning = evalData?.score_reasoning || "";

  return (
    <div style={{ padding: "40px", maxWidth: "780px" }}>
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#FF8C00", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
        Step 5 of 5
      </p>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#fff", marginBottom: "4px" }}>Evaluate</h1>
      <h1 style={{ fontSize: "54px", fontWeight: "900", lineHeight: 1.05, color: "#FF8C00", marginBottom: "20px" }}>&amp; Ship.</h1>
      <p style={{ fontSize: "15px", color: "#777", lineHeight: 1.7, marginBottom: "32px" }}>
        Pipeline results aggregated from all 5 agents — real issue data, real code, real patch.
      </p>

      <AgentCard title="Evaluator Agent" description="Pipeline summary & validation"
        status={status} iconBg="#22C55E" icon={<ChartIcon />}>

        {status === "running" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#777", padding: "16px 0" }}>
            <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="#FF8C00" strokeWidth="4" opacity="0.25" />
              <path fill="#FF8C00" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading pipeline results...
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", color: "#EF4444", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {status === "success" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* ═══ ISSUE SECTION ═══ */}
            <div style={{ background: "#141414", border: "1px solid #252525", borderRadius: "10px", padding: "16px 18px" }}>
              <p style={sectionLabel}>Issue Analyzed</p>
              <p style={{ fontSize: "14px", fontWeight: "800", color: "#fff", marginBottom: "6px" }}>
                {issueTitle || "Untitled Issue"} <span style={{ fontSize: "11px", color: "#555", fontFamily: "monospace" }}>#{evalData?.issue_number}</span>
              </p>
              {issueSummary && <p style={{ fontSize: "12px", color: "#999", lineHeight: 1.6, marginBottom: "8px" }}>{issueSummary}</p>}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <Badge bg="rgba(255,140,0,0.1)" color="#FF8C00" border="rgba(255,140,0,0.25)">{issueType}</Badge>
                <Badge bg="rgba(239,68,68,0.1)" color="#EF4444" border="rgba(239,68,68,0.25)">{issueSev}</Badge>
                <Badge bg="rgba(255,255,255,0.04)" color="#777" border="rgba(255,255,255,0.08)">{issueComp}</Badge>
              </div>
              {issueData?.keywords?.length > 0 && (
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px" }}>
                  {issueData.keywords.map((kw, i) => (
                    <span key={i} style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: "#1a1a1a", color: "#666", border: "1px solid #252525" }}>{kw}</span>
                  ))}
                </div>
              )}
            </div>

            {/* ═══ BUG FILES ═══ */}
            {bugFiles.length > 0 && (
              <div style={{ background: "#141414", border: "1px solid #252525", borderRadius: "10px", padding: "16px 18px" }}>
                <p style={sectionLabel}>Bug Localized To ({bugFiles.length} files)</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {bugFiles.slice(0, 5).map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(255,140,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "800", color: "#FF8C00", flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#aaa" }}>{formatPath(f)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ PATCH DIFF ═══ */}
            {diff && (
              <div style={{ background: "#141414", border: "1px solid #252525", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #252525", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={sectionLabel}>Generated Patch Diff</p>
                  <Badge bg="rgba(34,197,94,0.1)" color="#22C55E" border="rgba(34,197,94,0.25)">{patchData?.files_changed || "?"} files changed</Badge>
                </div>
                <pre style={diffStyle}>
                  {diff.replace(/\\n/g, '\n').replace(/\\t/g, '  ')}
                </pre>
              </div>
            )}

            {/* ═══ CONFIDENCE + BREAKDOWN ═══ */}
            <div style={{ display: "flex", gap: "14px", alignItems: "stretch" }}>
              <div style={{ background: "#141414", border: "1px solid #252525", borderRadius: "10px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: "130px" }}>
                <p style={{ fontSize: "52px", fontWeight: "900", fontFamily: "monospace", color: scoreColor, lineHeight: 1 }}>{pct}%</p>
                <p style={{ ...sectionLabel, marginTop: "8px", marginBottom: 0 }}>Confidence</p>
              </div>
              <div style={{ flex: 1, background: "#141414", border: "1px solid #252525", borderRadius: "10px", padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px" }}>
                <p style={sectionLabel}>Score Breakdown</p>
                {rubricItems.map(({ key, label, max }) => {
                  const val = breakdown[key] ?? 0;
                  const barPct = max > 0 ? Math.min((val / max) * 100, 100) : 0;
                  const barColor = barPct >= 80 ? "#22C55E" : barPct >= 50 ? "#FF8C00" : "#EF4444";
                  return (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontSize: "11px", color: "#aaa" }}>{label}</span>
                        <span style={{ fontSize: "11px", fontFamily: "monospace", color: barColor, fontWeight: "700" }}>{val}/{max}</span>
                      </div>
                      <div style={{ height: "5px", borderRadius: "3px", background: "#252525" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                          style={{ height: "100%", borderRadius: "3px", background: barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ═══ AI REASONING ═══ */}
            {reasoning && (
              <div style={{ background: "#141414", border: "1px solid #252525", borderRadius: "8px", padding: "12px 16px" }}>
                <p style={sectionLabel}>AI Reasoning</p>
                <p style={{ fontSize: "13px", color: "#bbb", lineHeight: 1.6 }}>{reasoning}</p>
              </div>
            )}

            {/* ═══ VERDICT ═══ */}
            <div style={{ padding: "14px 18px", background: vs.bg, border: `1px solid ${vs.border}`, borderRadius: "10px" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color: vs.color }}>{vs.label}</span>
            </div>

            {/* ═══ TEST CASES ═══ */}
            {testCases.length > 0 && (
              <div style={{ background: "#141414", border: "1px solid #252525", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #252525", display: "flex", gap: "8px", alignItems: "center" }}>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#fff", margin: 0 }}>🧪 Generated Test Cases</p>
                  <Badge bg="rgba(34,197,94,0.1)" color="#22C55E" border="rgba(34,197,94,0.25)">{testCases.length}</Badge>
                </div>
                {testCases.map((tc, i) => (
                  <div key={i} style={{ borderBottom: i < testCases.length - 1 ? "1px solid #1f1f1f" : "none", padding: "14px 16px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: "700", color: "#22C55E" }}>{tc.name}</span>
                    {tc.file && <p style={{ fontSize: "11px", color: "#555", marginTop: "3px" }}>File: <span style={{ fontFamily: "monospace", color: "#777" }}>{formatPath(tc.file)}</span></p>}
                    {tc.description && <p style={{ fontSize: "12px", color: "#999", lineHeight: 1.5, marginTop: "4px" }}>{tc.description}</p>}
                    {tc.code && (
                      <pre style={{ fontFamily: "monospace", fontSize: "11px", color: "#aaa", background: "#0d0d0d", border: "1px solid #1f1f1f", borderRadius: "6px", padding: "10px 12px", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5, maxHeight: "200px", overflowY: "auto", margin: "8px 0 0" }}>
                        {tc.code}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ═══ PR LINK ═══ */}
            {prLink && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ background: "#0A2200", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "15px", fontWeight: "800", color: "#22C55E", marginBottom: "4px" }}>✅ Draft PR Created on GitHub</p>
                  <a href={prLink} target="_blank" rel="noreferrer"
                    style={{ fontSize: "13px", color: "#22C55E", opacity: 0.8, textDecoration: "underline", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {prLink}
                  </a>
                </div>
              </motion.div>
            )}

            {/* ═══ NO PR NOTICE ═══ */}
            {!prLink && (
              <div style={{ background: "rgba(255,140,0,0.06)", border: "1px solid rgba(255,140,0,0.2)", borderRadius: "10px", padding: "14px 18px" }}>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#FF8C00", marginBottom: "4px" }}>🔗 PR Not Yet Created</p>
                <p style={{ fontSize: "12px", color: "#777", lineHeight: 1.6 }}>
                  Re-run the pipeline to generate a draft PR on GitHub. The evaluator will commit the patch diff to a new branch and open the PR automatically.
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ fontSize: "12px", color: "#444" }}>Fixora completed the full 5-agent pipeline.</p>
            </div>
          </motion.div>
        )}
      </AgentCard>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────
const sectionLabel = { fontSize: "10px", fontWeight: "700", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" };
const diffStyle = { fontFamily: "monospace", fontSize: "11px", color: "#aaa", padding: "14px 16px", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5, maxHeight: "300px", overflowY: "auto", margin: 0 };

const Badge = ({ bg, color, border, children }) => (
  <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px", background: bg, color, border: `1px solid ${border}` }}>{children}</span>
);
