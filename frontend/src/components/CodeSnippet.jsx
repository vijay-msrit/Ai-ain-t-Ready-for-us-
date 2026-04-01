import { motion } from "framer-motion";
import { useState } from "react";

export default function CodeSnippet({ filePath, startLine, endLine, snippet, score }) {
  const [collapsed, setCollapsed] = useState(false);
  const pct = score !== undefined ? Math.round(score * 100) : null;
  const scoreColor = pct >= 80 ? "text-success" : pct >= 60 ? "text-yellow" : "text-danger";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-dark overflow-hidden"
    >
      {/* File bar */}
      <div
        className="flex items-center justify-between px-5 py-3.5 bg-navy cursor-pointer hover:bg-yellow/5 transition-colors border-b border-navy-border"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-yellow shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-mono text-sm text-white truncate">{filePath}</span>
          <span className="text-muted text-xs shrink-0">L{startLine}–{endLine}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {pct !== null && (
            <span className={`text-xs font-bold font-mono ${scoreColor}`}>{pct}%</span>
          )}
          <svg className={`w-4 h-4 text-muted transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {!collapsed && (
        <div className="code-dark rounded-none border-0 border-t-0 m-0">
          <pre className="text-slate-300 whitespace-pre-wrap break-words">{snippet}</pre>
        </div>
      )}
    </motion.div>
  );
}
