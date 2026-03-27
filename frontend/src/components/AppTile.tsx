import { useState } from "react";
import type { AppItem } from "@/types";

const ICON_MAP: Record<string, string> = {
  BadgeOutlined: "badge",
  ReceiptLong: "receipt_long",
  PieChartOutline: "pie_chart_outline",
  ShoppingCart: "shopping_cart",
  LocalShipping: "local_shipping",
  Inventory: "inventory_2",
  AccountBalance: "account_balance",
  People: "people",
  "Precision Manufacturing": "precision_manufacturing",
  VerifiedUser: "verified_user",
  Assessment: "assessment",
};

interface Props {
  app: AppItem;
  accentColor: string;
  onClick: () => void;
}

function AppTile({ app, accentColor, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  const iconName = ICON_MAP[app.icon] || "apps";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "var(--color-surface-hover)" : "var(--color-surface)",
        border: `1px solid ${hovered ? accentColor + "40" : "var(--color-border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius-md)",
          background: accentColor + "10",
          border: `1px solid ${accentColor}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          className="material-icons-outlined"
          style={{
            fontSize: 26,
            color: accentColor,
          }}
        >
          {iconName}
        </span>
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            marginBottom: 6,
          }}
        >
          {app.name}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
          }}
        >
          {app.description}
        </div>
        <div
          style={{
            fontSize: 11,
            color: accentColor,
            fontWeight: 500,
            marginTop: 8,
          }}
        >
          {app.category}
        </div>
      </div>
    </div>
  );
}

export default AppTile;
