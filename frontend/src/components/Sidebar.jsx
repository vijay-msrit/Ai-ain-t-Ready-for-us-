import { Link, useLocation } from "react-router-dom";

const STEPS = [
  { label: "Indexer",         path: "/indexer",   num: 1 },
  { label: "Issue Processor", path: "/issue",     num: 2 },
  { label: "Localizer",       path: "/localizer", num: 3 },
  { label: "Patch Generator", path: "/patcher",   num: 4 },
  { label: "Evaluator",       path: "/evaluator", num: 5 },
];

const Check = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function Sidebar() {
  const { pathname } = useLocation();
  const activeIdx = STEPS.findIndex(s => s.path === pathname);

  return (
    <aside style={{
      width: "330px", minHeight: "100vh", background: "var(--bg-main)",
      borderRight: "1px solid var(--bg-card)", display: "flex", flexDirection: "column",
      padding: "32px 20px", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
        <div style={{
        width: "42px", height: "42px", background: "var(--accent-blue)", borderRadius: "10px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "15px", fontWeight: "900", color: "#fff", flexShrink: 0,
        }}>FX</div>
        <div>
          <p style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-main)", lineHeight: 1.1 }}>Fixora</p>
          <p style={{ fontSize: "11px", color: "var(--text-muted-dark)", marginTop: "3px" }}>AI Issue Resolver</p>
        </div>
      </div>

      <p style={{
        fontSize: "11px", fontWeight: "700", color: "var(--accent-yellow)",
        letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "14px",
      }}>Pipeline</p>

      {/* Vertical connector */}
      <nav style={{ position: "relative" }}>
        <div style={{
          position: "absolute", left: "26px", top: "28px", bottom: "28px",
          width: "2px", background: "var(--border-dark)",
          zIndex: 0,
        }} />

        {STEPS.map((step, i) => {
          const isActive = pathname === step.path;
          const isDone   = i < activeIdx;
          return (
            <Link key={step.path} to={step.path} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "7px 8px", borderRadius: "8px", position: "relative", zIndex: 1,
                background: isActive ? "var(--bg-card)" : "transparent",
                marginBottom: "2px",
              }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: "600", letterSpacing: "0.05em",
                  background: isDone ? "var(--accent-blue)" : isActive ? "var(--accent-yellow)" : "var(--bg-main)",
                  border: isDone || isActive ? "none" : "1.5px solid var(--border-dark)",
                  color: isDone || isActive ? "#fff" : "var(--text-muted-dark)",
                }}>
                  {isDone ? <Check /> : step.num}
                </div>
                <div>
                  <p style={{
                    fontSize: "16px", fontWeight: isDone || isActive ? "500" : "400",
                    color: isDone || isActive ? "var(--text-main)" : "var(--text-muted-dark)", lineHeight: 1.2,
                    letterSpacing: "0.08em",
                  }}>{step.label}</p>
                  <p style={{
                    fontSize: "12px", fontWeight: "600", marginTop: "2px",
                    color: isDone ? "var(--accent-blue)" : isActive ? "var(--accent-yellow)" : "transparent",
                    letterSpacing: "0.15em",
                  }}>{isDone ? "Done" : isActive ? "Active" : "·"}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
