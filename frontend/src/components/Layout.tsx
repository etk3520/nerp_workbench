import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";

function Layout() {
  const navigate = useNavigate();
  const [currentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          height: 48,
          background: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          <span
            className="material-icons-outlined"
            style={{ color: "var(--color-accent-light)", fontSize: 22 }}
          >
            hub
          </span>
          <span
            style={{
              color: "var(--color-text-inverse)",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            N-ERP Workbench
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
            }}
          >
            {currentTime}
          </span>
          <div
            style={{
              width: 1,
              height: 20,
              background: "rgba(255,255,255,0.15)",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--color-primary-light)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="material-icons-outlined"
                style={{ fontSize: 16, color: "rgba(255,255,255,0.8)" }}
              >
                person
              </span>
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 13,
              }}
            >
              관리자
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
