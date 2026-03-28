import React from "react";
import { Icon } from "../icons/Icons";
import { T } from "../../styles/theme";

export function FamilyBottomNav({ activeTab, onNavigate }) {
  const tabs = [
    { id: "family_dashboard", icon: Icon.LayoutDashboard, label: "Accueil" },
    { id: "family_health", icon: Icon.Pill, label: "Santé" },
    { id: "family_assistant", icon: Icon.Bot, label: "Assistant" },
    { id: "family_calendar", icon: Icon.Calendar, label: "Agenda" },
    { id: "family_settings", icon: Icon.Settings, label: "Réglages" }
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(0,0,0,0.05)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "12px 10px 24px",
        zIndex: 100,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.04)"
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const color = isActive ? T.primary : T.textLight;

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              padding: "8px 12px",
              color: color,
              transition: "all 0.2s ease"
            }}
          >
            <div
              style={{
                width: 44,
                height: 32,
                borderRadius: 16,
                backgroundColor: isActive ? `${T.primary}15` : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s ease"
              }}
            >
              <tab.icon active={isActive} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                color: color,
                fontFamily: "Inter, sans-serif"
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
