import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchApps } from "@/api/apps";
import type { AppItem } from "@/types";
import AppTile from "./AppTile";

const CATEGORY_COLORS: Record<string, string> = {
  보안: "#d84315",
  비용관리: "#1565c0",
  영업: "var(--color-category-sales)",
  구매: "var(--color-category-purchase)",
  물류: "var(--color-category-logistics)",
  회계: "var(--color-category-accounting)",
  인사: "var(--color-category-hr)",
  생산: "var(--color-category-production)",
  품질: "var(--color-category-quality)",
  경영지원: "var(--color-category-mgmt)",
};

function Dashboard() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApps()
      .then(setApps)
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          color: "var(--color-text-muted)",
        }}
      >
        로딩 중...
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            marginBottom: 4,
          }}
        >
          업무 메뉴
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
          }}
        >
          사용할 업무 모듈을 선택하세요
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        {apps.map((app) => (
          <AppTile
            key={app.id}
            app={app}
            accentColor={
              CATEGORY_COLORS[app.category] || "var(--color-accent)"
            }
            onClick={() => navigate(app.path)}
          />
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
