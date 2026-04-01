export default function BottomNav({ step, total, hasPrev, hasNext, onPrev, onNext }) {
  const btn = {
    padding: "8px 20px", borderRadius: "8px", fontSize: "13px",
    fontWeight: "600", fontFamily: "inherit", cursor: "pointer", border: "1px solid #2A2A2A",
  };
  return (
    <div style={{
      height: "52px", background: "#0F0F0F", borderTop: "1px solid #1E1E1E",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", flexShrink: 0,
    }}>
      <span style={{ fontSize: "13px", color: "#555", fontWeight: "500" }}>
        Step {step} / {total}
      </span>

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={onPrev} disabled={!hasPrev} className="btn-prev" style={{
          ...btn,
          background: hasPrev ? "#1A1A1A" : "#0F0F0F",
          color: hasPrev ? "#fff" : "#444",
          cursor: hasPrev ? "pointer" : "not-allowed",
        }}>Previous</button>

        <button onClick={onNext} disabled={!hasNext} className="btn-next" style={{
          ...btn,
          background: hasNext ? "#6366F1" : "#1A1A1A",
          borderColor: hasNext ? "#6366F1" : "#2A2A2A",
          color: hasNext ? "#fff" : "#444",
          cursor: hasNext ? "pointer" : "not-allowed",
        }}>Next</button>
      </div>
    </div>
  );
}
