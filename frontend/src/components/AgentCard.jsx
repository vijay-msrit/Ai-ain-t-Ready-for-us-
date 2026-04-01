import { useState } from "react";

const STATUS_STYLE = {
  idle:    { bg: "rgba(var(--accent-blue-rgb), 0.12)", color: "#818CF8", border: "1px solid rgba(var(--accent-blue-rgb), 0.3)",  label: "Idle" },
  running: { bg: "rgba(var(--accent-yellow-rgb), 0.12)",  color: "var(--accent-yellow)", border: "1px solid rgba(var(--accent-yellow-rgb), 0.3)",  label: "Running" },
  success: { bg: "rgba(34,197,94,0.12)",  color: "var(--accent-green)", border: "1px solid rgba(34,197,94,0.3)",  label: "Success" },
  error:   { bg: "rgba(239,68,68,0.12)",  color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.3)",  label: "Error" },
};

export default function AgentCard({ title, description, status = "idle", iconBg, icon, children }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.idle;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        marginBottom: "16px",
        transition: "box-shadow 0.25s ease, border-color 0.25s ease",
        boxShadow: hovered ? "var(--shadow-hover)" : "var(--shadow-idle)",
        borderColor: hovered ? "var(--border-dark)" : "var(--border)",
        overflow: "hidden",
      }}
    >

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "10px",
            background: iconBg || "var(--accent-blue)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>{icon}</div>
          <div>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)" }}>{title}</p>
            <p style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>{description}</p>
          </div>
        </div>
        <span style={{
          fontSize: "11px", fontWeight: "700", padding: "4px 10px",
          borderRadius: "6px", background: s.bg, color: s.color, border: s.border,
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          {status === "running" && (
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "var(--accent-yellow)", display: "inline-block",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          )}
          {s.label}
        </span>
      </div>

      <div style={{ height: "1px", background: "var(--border)", marginBottom: "16px" }} />

      {children}
    </div>
  );
}
