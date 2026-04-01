import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import AgentCard from "../components/AgentCard";
import { fetchIssue } from "../api/client";

const SEV = {
  critical: "bg-danger/15 text-danger border border-danger/30",
  high:     "bg-orange-900/20 text-orange-300 border border-orange-700/30",
  medium:   "bg-yellow/10 text-yellow border border-yellow/30",
  low:      "bg-success/10 text-success border border-success/30",
};

function Row({ label, value }) {
  return (
    <div className="flex gap-4 py-2.5 border-b border-navy-border last:border-0">
      <span className="text-muted text-sm w-32 shrink-0">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}

export default function IssueProcessor() {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setStatus("running");
      try { const r = await fetchIssue(); setData(r.data); setStatus("success"); }
      catch (e) { setError(e.message); setStatus("error"); }
    })();
  }, []);

  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">

        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-light border-b border-navy-border px-10 py-14">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-yellow/8 blur-3xl pointer-events-none" />
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-2xl">
            <p className="eyebrow">Step 2 of 5</p>
            <h1 className="text-5xl font-black text-white leading-[1.08] tracking-tight">
              Understand<br />
              <span className="text-yellow">the Issue.</span>
            </h1>
            <p className="text-muted text-base mt-4 leading-relaxed">
              AI classifies the GitHub issue — extracting type, severity, component, and steps to reproduce.
            </p>
          </motion.div>
        </section>

        <div className="flex-1 p-10 space-y-6 max-w-2xl">
          <AgentCard title="Issue Processor Agent" description="AI-structured issue breakdown" status={status} icon="🐛">

            {status === "running" && (
              <div className="flex items-center gap-3 text-muted py-6">
                <svg className="w-5 h-5 animate-spin text-yellow" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Classifying issue with AI...
              </div>
            )}
            {error && <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 text-danger text-sm">{error}</div>}

            {data && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                {/* Title block */}
                <div className="bg-navy rounded-2xl border border-navy-border p-5">
                  <p className="eyebrow mb-1">Issue Title</p>
                  <p className="text-white font-bold text-lg leading-snug">{data.title}</p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className="badge bg-yellow/10 text-yellow border border-yellow/25">{data.type}</span>
                  <span className="badge bg-white/5 text-muted border border-navy-border">{data.component}</span>
                  <span className={`badge ${SEV[data.severity?.toLowerCase()] || SEV.medium}`}>
                    {data.severity} Severity
                  </span>
                </div>

                {/* Details table */}
                <div className="bg-navy rounded-2xl border border-navy-border px-5 py-1">
                  <Row label="Type" value={data.type} />
                  <Row label="Component" value={data.component} />
                  <Row label="Severity" value={data.severity} />
                </div>

                {/* Summary */}
                {data.summary && (
                  <div className="bg-navy rounded-2xl border border-navy-border p-5">
                    <p className="eyebrow mb-2">Summary</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{data.summary}</p>
                  </div>
                )}

                {/* Steps */}
                {data.steps_to_reproduce?.length > 0 && (
                  <div className="bg-navy rounded-2xl border border-navy-border p-5">
                    <p className="eyebrow mb-3">Steps to Reproduce</p>
                    <ol className="space-y-2 list-decimal list-inside">
                      {data.steps_to_reproduce.map((s, i) => (
                        <li key={i} className="text-slate-300 text-sm">{s}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Keywords */}
                {data.keywords?.length > 0 && (
                  <div>
                    <p className="eyebrow mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {data.keywords.map((k) => (
                        <span key={k} className="font-mono text-xs bg-navy border border-navy-border text-muted px-3 py-1 rounded-full">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AgentCard>

          {data && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <button onClick={() => navigate("/localizer")} className="btn-yellow">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Run Localization
              </button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
