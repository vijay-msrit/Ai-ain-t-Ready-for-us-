export default function BottomNav({ step, total, hasPrev, hasNext, onPrev, onNext }) {
  const btn = {
    padding: "8px 20px", borderRadius: "8px", fontSize: "16px",
    fontWeight: "500", letterSpacing: "0.08em", fontFamily: "inherit", cursor: "pointer", border: "1px solid var(--border)",
  };
  return (
    <div style={{
      height: "52px", background: "var(--bg-sidebar)", borderTop: "1px solid var(--border-dark)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", flexShrink: 0,
    }}>
      <span style={{ fontSize: "15px", color: "var(--text-muted-dark)", fontWeight: "400", letterSpacing: "0.1em" }}>
        Step {step} / {total}
      </span>

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={onPrev} disabled={!hasPrev} className="btn-prev" style={{
          ...btn,
          background: hasPrev ? "var(--bg-card)" : "var(--bg-sidebar)",
          color: hasPrev ? "var(--text-main)" : "var(--text-muted-dark)",
          cursor: hasPrev ? "pointer" : "not-allowed",
        }}>Previous</button>

        <button onClick={onNext} disabled={!hasNext} className="btn-next" style={{
          ...btn,
          background: hasNext ? "var(--accent-blue)" : "var(--bg-card)",
          borderColor: hasNext ? "var(--accent-blue)" : "var(--border)",
          color: hasNext ? "var(--text-main)" : "var(--text-muted-dark)",
          cursor: hasNext ? "pointer" : "not-allowed",
        }}>Next</button>
      </div>
    </div>
  );
}
