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
      width: "330px", minHeight: "100vh", background: "#0A0A0A",
      borderRight: "1px solid #1A1A1A", display: "flex", flexDirection: "column",
      padding: "32px 20px", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
        <div style={{
        width: "42px", height: "42px", background: "#6366F1", borderRadius: "10px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "15px", fontWeight: "900", color: "#fff", flexShrink: 0,
        }}>FX</div>
        <div>
          <p style={{ fontSize: "17px", fontWeight: "800", color: "#fff", lineHeight: 1.1 }}>Fixora</p>
          <p style={{ fontSize: "11px", color: "#555", marginTop: "3px" }}>AI Issue Resolver</p>
        </div>
      </div>

      <p style={{
        fontSize: "11px", fontWeight: "700", color: "#FF8C00",
        letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "14px",
      }}>Pipeline</p>

      {/* Vertical connector */}
      <nav style={{ position: "relative" }}>
        <div style={{
          position: "absolute", left: "15px", top: "28px", bottom: "28px",
          width: "1px", background: "#1E1E1E",
        }} />

        {STEPS.map((step, i) => {
          const isActive = pathname === step.path;
          const isDone   = i < activeIdx;
          return (
            <Link key={step.path} to={step.path} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "7px 8px", borderRadius: "8px", position: "relative", zIndex: 1,
                background: isActive ? "#1A1A1A" : "transparent",
                marginBottom: "2px",
              }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: "800",
                  background: isDone ? "#6366F1" : isActive ? "#FF8C00" : "transparent",
                  border: isDone || isActive ? "none" : "1.5px solid #2A2A2A",
                  color: isDone || isActive ? "#fff" : "#444",
                }}>
                  {isDone ? <Check /> : step.num}
                </div>
                <div>
                  <p style={{
                    fontSize: "14px", fontWeight: isDone || isActive ? "600" : "400",
                    color: isDone || isActive ? "#fff" : "#444", lineHeight: 1.2,
                  }}>{step.label}</p>
                  <p style={{
                    fontSize: "11px", fontWeight: "600", marginTop: "2px",
                    color: isDone ? "#6366F1" : isActive ? "#FF8C00" : "transparent",
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
