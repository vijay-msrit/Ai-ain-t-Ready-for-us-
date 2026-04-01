import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Indexer from "./pages/Indexer";
import IssueProcessor from "./pages/IssueProcessor";
import Localizer from "./pages/Localizer";
import Patcher from "./pages/Patcher";
import Evaluator from "./pages/Evaluator";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/indexer" replace />} />
        <Route path="/indexer" element={<Indexer />} />
        <Route path="/issue" element={<IssueProcessor />} />
        <Route path="/localizer" element={<Localizer />} />
        <Route path="/patcher" element={<Patcher />} />
        <Route path="/evaluator" element={<Evaluator />} />
      </Routes>
    </BrowserRouter>
  );
}
