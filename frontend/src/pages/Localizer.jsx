import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import AgentCard from "../components/AgentCard";
import CodeSnippet from "../components/CodeSnippet";
import { fetchLocalize } from "../api/client";

export default function Localizer() {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setStatus("running");
      try { const r = await fetchLocalize(); setData(r.data); setStatus("success"); }
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
            <p className="eyebrow">Step 3 of 5</p>
            <h1 className="text-5xl font-black text-white leading-[1.08] tracking-tight">
              Find the<br />
              <span className="text-yellow">Bug.</span>
            </h1>
            <p className="text-muted text-base mt-4 leading-relaxed">
              Semantic vector search through your codebase pinpoints the most relevant files and snippets.
            </p>
          </motion.div>
        </section>

        <div className="flex-1 p-10 space-y-8">

          {/* Probable files */}
          <AgentCard title="Probable Bug Files" description="Ranked by semantic similarity score" status={status} icon="🎯">
            {status === "running" && (
              <div className="flex items-center gap-3 text-muted py-6">
                <svg className="w-5 h-5 animate-spin text-yellow" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Querying ChromaDB vector index...
              </div>
            )}
            {error && <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 text-danger text-sm">{error}</div>}

            {data?.probable_bug_files && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {data.probable_bug_files.map((file, i) => (
                  <motion.div key={file} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-3 bg-navy border border-navy-border rounded-2xl px-4 py-3.5">
                    <span className="w-6 h-6 rounded-full bg-yellow/15 text-yellow text-xs font-black flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-mono text-sm text-white truncate">{file}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AgentCard>

          {/* Code snippets */}
          {data?.relevant_snippets && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-white font-bold text-lg">Relevant Snippets</h3>
                <span className="badge bg-yellow/10 text-yellow border border-yellow/25">
                  {data.relevant_snippets.length} found
                </span>
              </div>
              <div className="space-y-3">
                {data.relevant_snippets.map((s, i) => (
                  <CodeSnippet key={i} filePath={s.file_path} startLine={s.start_line}
                    endLine={s.end_line} snippet={s.snippet} score={s.score} />
                ))}
              </div>
            </motion.div>
          )}

          {data && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <button onClick={() => navigate("/patcher")} className="btn-yellow">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Generate Patch
              </button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
