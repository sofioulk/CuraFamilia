import React from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { Icon } from "../../components/icons/Icons";

function ShellScreen({ title, subtitle, icon: HeaderIcon, activeTab, onNavigate }) {
  return (
    <Phone>
      <div style={{
        padding: "24px 20px 100px",
        minHeight: "100vh",
        backgroundColor: "#F7F9FC",
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: T.navy }}>{title}</h1>
            <p style={{ margin: 0, fontSize: 14, color: T.textLight }}>{subtitle}</p>
          </div>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: T.primary + "15",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.primary
          }}>
            <HeaderIcon active size={20} />
          </div>
        </div>

        {/* Empty State */}
        <div style={{
          backgroundColor: T.white,
          borderRadius: 20,
          padding: 40,
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          border: `1px dashed ${T.primary}40`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16
        }}>
          <div style={{ color: T.textLight, opacity: 0.5 }}>
             <HeaderIcon size={48} />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.navy }}>En construction</h3>
          <p style={{ margin: 0, fontSize: 14, color: T.text, lineHeight: 1.5 }}>
            Cet \u00E9cran sera connect\u00E9 au backend ult\u00E9rieurement.
          </p>
        </div>
      </div>
      <FamilyBottomNav activeTab={activeTab} onNavigate={onNavigate} />
    </Phone>
  );
}

export function FamilyHealth({ onNavigate }) {
  return <ShellScreen title="Sant\u00E9 & Traitements" subtitle="Gestion des m\u00E9dicaments" icon={Icon.Pill} activeTab="family_health" onNavigate={onNavigate} />;
}

export function FamilyAssistant({ onNavigate }) {
  return <ShellScreen title="Rapports IA" subtitle="Synth\u00E8ses de l'assistant" icon={Icon.Bot} activeTab="family_assistant" onNavigate={onNavigate} />;
}

export function FamilyCalendar({ onNavigate }) {
  return <ShellScreen title="Agenda partag\u00E9" subtitle="Rendez-vous m\u00E9dicaux" icon={Icon.Calendar} activeTab="family_calendar" onNavigate={onNavigate} />;
}

export function FamilySettings({ onNavigate }) {
  return <ShellScreen title="R\u00E9glages" subtitle="Configuration & Rapports" icon={Icon.Settings} activeTab="family_settings" onNavigate={onNavigate} />;
}
