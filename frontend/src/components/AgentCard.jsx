const STATUS_STYLE = {
  idle:    { bg: "rgba(99,102,241,0.12)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.3)",  label: "Idle" },
  running: { bg: "rgba(255,140,0,0.12)",  color: "#FF8C00", border: "1px solid rgba(255,140,0,0.3)",  label: "Running" },
  success: { bg: "rgba(34,197,94,0.12)",  color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)",  label: "Success" },
  error:   { bg: "rgba(239,68,68,0.12)",  color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)",  label: "Error" },
};

export default function AgentCard({ title, description, status = "idle", iconBg, icon, children }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.idle;
  return (
    <div style={{
      background: "#141414", border: "1px solid #252525",
      borderRadius: "12px", padding: "20px", marginBottom: "16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "10px",
            background: iconBg || "#6366F1",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>{icon}</div>
          <div>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>{title}</p>
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
              background: "#FF8C00", display: "inline-block",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          )}
          {s.label}
        </span>
      </div>

      <div style={{ height: "1px", background: "#252525", marginBottom: "16px" }} />
      {children}
    </div>
  );
}
