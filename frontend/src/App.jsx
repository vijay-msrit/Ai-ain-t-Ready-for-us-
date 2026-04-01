import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import Indexer from "./pages/Indexer";
import IssueProcessor from "./pages/IssueProcessor";
import Localizer from "./pages/Localizer";
import Patcher from "./pages/Patcher";
import Evaluator from "./pages/Evaluator";

const STEPS = ["/indexer", "/issue", "/localizer", "/patcher", "/evaluator"];

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const idx = STEPS.indexOf(location.pathname);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/indexer" replace />} />
        <Route path="/indexer"   element={<Layout><Indexer /></Layout>} />
        <Route path="/issue"     element={<Layout><IssueProcessor /></Layout>} />
        <Route path="/localizer" element={<Layout><Localizer /></Layout>} />
        <Route path="/patcher"   element={<Layout><Patcher /></Layout>} />
        <Route path="/evaluator" element={<Layout><Evaluator /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
