import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import AgentCard from "../components/AgentCard";
import { fetchEvaluate } from "../api/client";

function ScoreRing({ label, value, color, delay = 0 }) {
  const pct          = Math.round((value ?? 0) * 100);
  const r            = 36;
  const circumference = 2 * Math.PI * r;
  const offset       = circumference - (pct / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="card-dark p-7 flex flex-col items-center gap-4"
    >
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#1C2333" strokeWidth="7" />
          <motion.circle
            cx="40" cy="40" r={r} fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.3, ease: "easeOut", delay: delay + 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-black text-2xl font-mono">{pct}%</span>
        </div>
      </div>
      <p className="text-muted text-sm text-center font-medium">{label}</p>
    </motion.div>
  );
}

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
    <div className="flex min-h-screen bg-navy">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">

        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-light border-b border-navy-border px-10 py-14">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-yellow/8 blur-3xl pointer-events-none" />
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-2xl">
            <p className="eyebrow">Step 5 of 5</p>
            <h1 className="text-5xl font-black text-white leading-[1.08] tracking-tight">
              Evaluate<br />
              <span className="text-yellow">&amp; Ship.</span>
            </h1>
            <p className="text-muted text-base mt-4 leading-relaxed">
              Confidence scores, test results, and automatic PR creation — all in one place.
            </p>
          </motion.div>
        </section>

        <div className="flex-1 p-10 space-y-8 max-w-3xl">

          {/* Score rings */}
          <div className="grid grid-cols-3 gap-4">
            <ScoreRing label="Fix Confidence"  value={data?.fix_confidence_score} color="#F5C842" delay={0} />
            <ScoreRing label="Test Pass Rate"   value={data?.test_pass_rate}        color="#3FB950" delay={0.1} />
            <ScoreRing label="Code Quality"     value={data?.code_quality_score}    color="#58A6FF" delay={0.2} />
          </div>

          <AgentCard title="Evaluator Agent" description="Pull request summary" status={status} icon="📊">
            {status === "running" && (
              <div className="flex items-center gap-3 text-muted py-6">
                <svg className="w-5 h-5 animate-spin text-yellow" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running evaluation suite...
              </div>
            )}
            {error && <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 text-danger text-sm">{error}</div>}

            {data && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="bg-navy rounded-2xl border border-navy-border divide-y divide-navy-border">

                  {data.pr_link && (
                    <div className="flex items-center gap-3 px-5 py-4">
                      <svg className="w-4 h-4 text-yellow shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <div>
                        <p className="text-muted text-xs mb-0.5">PR Link</p>
                        <a href={data.pr_link} target="_blank" rel="noreferrer"
                          className="text-yellow text-sm hover:underline truncate block max-w-sm">
                          {data.pr_link}
                        </a>
                      </div>
                    </div>
                  )}

                  {data.branch_name && (
                    <div className="flex items-center gap-3 px-5 py-4">
                      <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <div>
                        <p className="text-muted text-xs mb-0.5">Branch</p>
                        <span className="text-white font-mono text-sm">{data.branch_name}</span>
                      </div>
                    </div>
                  )}

                  {data.commit_message && (
                    <div className="flex items-start gap-3 px-5 py-4">
                      <svg className="w-4 h-4 text-muted mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <div>
                        <p className="text-muted text-xs mb-0.5">Commit Message</p>
                        <span className="text-white font-mono text-sm leading-relaxed">{data.commit_message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AgentCard>

          {/* Success banner — Wildtype-inspired bold yellow statement block */}
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative overflow-hidden rounded-4xl bg-yellow px-10 py-10"
            >
              <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-yellow-dark/40 pointer-events-none" />
              <div className="relative flex items-start gap-5">
                <div className="w-14 h-14 rounded-full bg-ink/15 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-ink font-black text-2xl leading-tight">Pull Request<br />Created Successfully.</p>
                  <p className="text-ink/60 text-sm mt-2 font-medium">
                    Fixora completed the full 5-agent pipeline and submitted your fix for review.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
