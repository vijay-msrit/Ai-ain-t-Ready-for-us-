import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const STEPS = [
  { label: "Indexer",        path: "/indexer",   num: 1 },
  { label: "Issue Processor",path: "/issue",     num: 2 },
  { label: "Localizer",      path: "/localizer", num: 3 },
  { label: "Patch Generator",path: "/patcher",   num: 4 },
  { label: "Evaluator",      path: "/evaluator", num: 5 },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const activeIdx = STEPS.findIndex((s) => s.path === pathname);

  return (
    <aside className="w-64 min-h-screen bg-navy-light border-r border-navy-border flex flex-col py-8 px-5 shrink-0">
      {/* Logo */}
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-yellow flex items-center justify-center shadow-yellow-sm">
            <span className="text-ink font-black text-sm">FX</span>
          </div>
          <div>
            <p className="text-white font-black text-lg leading-none tracking-tight">Fixora</p>
            <p className="text-muted text-xs mt-0.5">AI Issue Resolver</p>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="eyebrow px-1 mb-3">Pipeline</div>

      {/* Steps */}
      <nav className="flex flex-col gap-1 relative">
        <div className="absolute left-[22px] top-5 bottom-5 w-px bg-navy-border" />

        {STEPS.map((step, i) => {
          const isActive = pathname === step.path;
          const isDone   = i < activeIdx;

          return (
            <Link key={step.path} to={step.path}>
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className={`
                  relative flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 z-10
                  ${isActive ? "bg-yellow/10 border border-yellow/30"
                    : isDone  ? "hover:bg-white/5"
                    : "hover:bg-white/5"}
                `}
              >
                {/* Bubble */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0
                  border-2 transition-all duration-300
                  ${isActive ? "bg-yellow border-yellow text-ink shadow-yellow-sm"
                    : isDone  ? "bg-success/20 border-success text-success"
                    : "bg-navy-card border-navy-border text-muted"}
                `}>
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.num}
                </div>

                <div>
                  <p className={`text-sm font-semibold leading-none ${
                    isActive ? "text-yellow" : isDone ? "text-white" : "text-muted"
                  }`}>{step.label}</p>
                  <p className={`text-xs mt-0.5 ${
                    isActive ? "text-yellow/60" : isDone ? "text-success/70" : "text-navy-border"
                  }`}>
                    {isActive ? "Active" : isDone ? "Done" : `Step ${step.num}`}
                  </p>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-8 border-t border-navy-border">
        <p className="text-muted/50 text-xs text-center">Powered by Claude AI</p>
      </div>
    </aside>
  );
}
