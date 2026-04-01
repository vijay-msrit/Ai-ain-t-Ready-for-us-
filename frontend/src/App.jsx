import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import Indexer from "./pages/Indexer";
import IssueProcessor from "./pages/IssueProcessor";
import Localizer from "./pages/Localizer";
import Patcher from "./pages/Patcher";
import Evaluator from "./pages/Evaluator";
import Home from "./pages/Home";

const STEPS = ["/indexer", "/issue", "/localizer", "/patcher", "/evaluator"];

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const idx = STEPS.indexOf(location.pathname);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-main)" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
        <BottomNav
          step={idx + 1} total={5}
          hasPrev={idx > 0} hasNext={idx < 4}
          onPrev={() => idx > 0 && navigate(STEPS[idx - 1])}
          onNext={() => idx < 4 && navigate(STEPS[idx + 1])}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("theme-light");
    } else {
      document.body.classList.remove("theme-light");
    }
  }, [theme]);

  const isLight = theme === "light";

  return (
    <BrowserRouter>
      {/* Small Minimalist Theme Toggle */}
      <div 
        onClick={() => setTheme(isLight ? "dark" : "light")}
        style={{
          position: "fixed",
          top: "20px",
          right: "24px",
          zIndex: 9999,
          width: "44px",
          height: "24px",
          backgroundColor: isLight ? "#D5DDE5" : "#2A2A2A",
          borderRadius: "9999px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          padding: "2px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transition: "background-color 0.2s ease"
        }}
      >
        <div style={{
          width: "20px",
          height: "20px",
          backgroundColor: isLight ? "#4CB050" : "#777",
          borderRadius: "50%",
          transform: isLight ? "translateX(20px)" : "translateX(0px)",
          transition: "transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), background-color 0.3s ease",
          boxShadow: isLight ? "none" : "0 1px 3px rgba(0,0,0,0.3)"
        }} />
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/indexer"   element={<Layout><Indexer /></Layout>} />
        <Route path="/issue"     element={<Layout><IssueProcessor /></Layout>} />
        <Route path="/localizer" element={<Layout><Localizer /></Layout>} />
        <Route path="/patcher"   element={<Layout><Patcher /></Layout>} />
        <Route path="/evaluator" element={<Layout><Evaluator /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
