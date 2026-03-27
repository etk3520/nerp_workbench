import { NavLink, Outlet } from "react-router-dom";

const MENU_ITEMS = [
  {
    group: "마스터 관리",
    items: [{ label: "과제 관리", path: "/apps/partner-access/master", disabled: true }],
  },
  {
    group: "신청",
    items: [
      { label: "신규 신청", path: "/apps/partner-access/new", disabled: false },
      { label: "변경/재신청", path: "/apps/partner-access/change", disabled: true },
    ],
  },
  {
    group: "처리",
    items: [
      { label: "신청 대기", path: "/apps/partner-access/pending", disabled: true },
    ],
  },
  {
    group: "관리",
    items: [
      { label: "정보 변경", path: "/apps/partner-access/edit", disabled: true },
      { label: "조회", path: "/apps/partner-access/list", disabled: true },
    ],
  },
];

export default function PartnerLayout() {
  return (
    <div style={{ height: "100%", display: "flex" }}>
      {/* Side menu */}
      <nav
        style={{
          width: 200,
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          overflowY: "auto",
          flexShrink: 0,
          paddingTop: 8,
        }}
      >
        {MENU_ITEMS.map((group) => (
          <div key={group.group} style={{ marginBottom: 8 }}>
            <div
              style={{
                padding: "8px 16px 4px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                letterSpacing: "0.03em",
              }}
            >
              {group.group}
            </div>
            {group.items.map((item) =>
              item.disabled ? (
                <div
                  key={item.path}
                  style={{
                    padding: "7px 16px 7px 24px",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    cursor: "not-allowed",
                    opacity: 0.5,
                  }}
                >
                  {item.label}
                </div>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive }) => ({
                    display: "block",
                    padding: "7px 16px 7px 24px",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive
                      ? "var(--color-primary)"
                      : "var(--color-text-primary)",
                    background: isActive ? "var(--color-bg)" : "transparent",
                    borderLeft: isActive
                      ? "3px solid var(--color-primary)"
                      : "3px solid transparent",
                    textDecoration: "none",
                    transition: "all 0.1s",
                  })}
                >
                  {item.label}
                </NavLink>
              )
            )}
          </div>
        ))}
      </nav>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Outlet />
      </div>
    </div>
  );
}
