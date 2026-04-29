import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import ProjectsPage from "@/pages/Projects";
import AnalysisPage from "@/pages/Analysis";
import MetricsPage from "@/pages/Metrics";
import ClassDetailPage from "@/pages/ClassDetail";
import DiagramsPage from "@/pages/Diagrams";
import McpPage from "@/pages/Mcp";
import HistoryPage from "@/pages/History";
import ReportsPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/metrics/class/:fqn" element={<ClassDetailPage />} />
        <Route path="/diagrams" element={<DiagramsPage />} />
        <Route path="/mcp" element={<McpPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Route>
    </Routes>
  );
}
