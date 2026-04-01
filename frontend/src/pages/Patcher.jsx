import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import AgentCard from "../components/AgentCard";
import { fetchPatch } from "../api/client";

function DiffLine({ line }) {
  if (line.startsWith("+") && !line.startsWith("+++"))
    return (
      <div className="flex gap-3 bg-success/10 px-3 py-0.5 rounded">
        <span className="text-success font-bold w-4 shrink-0 select-none">+</span>
        <span className="text-green-200">{line.slice(1)}</span>
      </div>
    );
  if (line.startsWith("-") && !line.startsWith("---"))
    return (
      <div className="flex gap-3 bg-danger/10 px-3 py-0.5 rounded">
        <span className="text-danger font-bold w-4 shrink-0 select-none">-</span>
        <span className="text-red-200">{line.slice(1)}</span>
      </div>
    );
  if (line.startsWith("@@"))
    return <div className="px-3 py-1 my-1"><span className="text-yellow text-xs font-mono">{line}</span></div>;
  if (line.startsWith("---") || line.startsWith("+++"))
    return <div className="px-3 py-0.5"><span className="text-muted text-xs font-mono">{line}</span></div>;
  return (
    <div className="px-3 py-0.5">
      <span className="text-muted/60 w-4 inline-block shrink-0 select-none"> </span>
      <span className="text-slate-400">{line.slice(1) || line}</span>
    </div>
  );
}

export default function Patcher() {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setStatus("running");
      try { const r = await fetchPatch(); setData(r.data); setStatus("success"); }
      catch (e) { setError(e.message); setStatus("error"); }
    })();
  }, []);

  const lines        = data?.diff ? data.diff.split("\n") : [];
  const addedCount   = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
  const removedCount = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length;

  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">

        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-light border-b border-navy-border px-10 py-14">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-yellow/8 blur-3xl pointer-events-none" />
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-2xl">
            <p className="eyebrow">Step 4 of 5</p>
            <h1 className="text-5xl font-black text-white leading-[1.08] tracking-tight">
              Generate<br />
              <span className="text-yellow">the Fix.</span>
            </h1>
            <p className="text-muted text-base mt-4 leading-relaxed">
              AI writes a precise patch diff to resolve the identified bug with minimal footprint.
            </p>
          </motion.div>
        </section>

        <div className="flex-1 p-10 space-y-6 max-w-4xl">

          {/* Stats */}
          {data && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4">
              {[
                { label: "Files Changed", val: data.files_changed ?? "—", color: "text-white" },
                { label: "Lines Added",   val: `+${addedCount}`,           color: "text-success" },
                { label: "Lines Removed", val: `-${removedCount}`,         color: "text-danger" },
              ].map((s) => (
                <div key={s.label} className="card-dark p-5 text-center">
                  <p className={`text-3xl font-black font-mono ${s.color}`}>{s.val}</p>
                  <p className="text-muted text-xs mt-1.5 font-medium">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}

          <AgentCard title="Patch Generator Agent" description="Unified diff output" status={status} icon="🩹">
            {status === "running" && (
              <div className="flex items-center gap-3 text-muted py-6">
                <svg className="w-5 h-5 animate-spin text-yellow" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating patch with AI...
              </div>
            )}
            {error && <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 text-danger text-sm">{error}</div>}

            {data?.diff && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="bg-navy border border-navy-border rounded-2xl overflow-hidden">
                  {/* Window chrome */}
                  <div className="flex items-center justify-between bg-navy-light px-4 py-2.5 border-b border-navy-border">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-danger/60" />
                      <div className="w-3 h-3 rounded-full bg-warning/60" />
                      <div className="w-3 h-3 rounded-full bg-success/60" />
                    </div>
                    <span className="text-muted text-xs font-mono">patch.diff</span>
                  </div>
                  <div className="p-4 font-mono text-sm space-y-0.5 overflow-x-auto max-h-[520px] overflow-y-auto">
                    {lines.map((line, i) => <DiffLine key={i} line={line} />)}
                  </div>
                </div>
              </motion.div>
            )}
          </AgentCard>

          {data && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <button onClick={() => navigate("/evaluator")} className="btn-yellow">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Apply & Evaluate
              </button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
