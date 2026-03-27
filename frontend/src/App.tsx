import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import PartnerLayout from "./components/partner/PartnerLayout";
import NewEntry from "./components/partner/NewEntry";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/apps/partner-access" element={<PartnerLayout />}>
          <Route index element={<Navigate to="new" replace />} />
          <Route path="new" element={<NewEntry />} />
        </Route>
        <Route
          path="/apps/:appId"
          element={
            <div style={{ padding: 32, color: "var(--color-text-secondary)" }}>
              모듈 준비 중입니다.
            </div>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
