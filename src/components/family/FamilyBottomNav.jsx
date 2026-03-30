import React from "react";
import { Icon } from "../icons/Icons";
import { T } from "../../styles/theme";

export function FamilyBottomNav({ activeTab, onNavigate = () => {} }) {
  const tabs = [
    { id: "family_dashboard", icon: Icon.LayoutDashboard, label: "Accueil" },
    { id: "family_health", icon: Icon.Pill, label: "Sante" },
    { id: "family_calendar", icon: Icon.Calendar, label: "Agenda" },
    { id: "family_assistant", icon: Icon.Bot, label: "Assistant" },
    { id: "family_settings", icon: Icon.Settings, label: "Reglages" },
  ];

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(12px)",
        borderTop: `1px solid ${T.teal100}`,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "10px 8px 16px",
        zIndex: 100,
        boxShadow: "0 -10px 22px rgba(13,148,136,0.08)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const color = isActive ? T.primary : T.textLight;

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            aria-label={tab.label}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              padding: "6px 6px",
              color,
              transition: "all 0.2s ease",
              minWidth: 62,
            }}
          >
            <div
              style={{
                width: 42,
                height: 28,
                borderRadius: 14,
                backgroundColor: isActive ? `${T.primary}15` : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              <tab.icon active={isActive} />
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 600,
                color,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
