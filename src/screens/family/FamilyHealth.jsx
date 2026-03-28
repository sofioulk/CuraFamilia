import React, { useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { Icon } from "../../components/icons/Icons";

function PillCard({ name, dose, time, compliance }) {
  const isGood = compliance >= 80;
  const color = isGood ? T.primary : "#F59E0B";
  const bg = isGood ? `${T.primary}10` : "#F59E0B10";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px",
      backgroundColor: T.white,
      borderRadius: 16,
      marginBottom: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
      border: `1px solid rgba(0,0,0,0.03)`
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, backgroundColor: bg,
          display: "flex", alignItems: "center", justifyContent: "center", color: color
        }}>
          <Icon.Pill active />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.navy }}>{name}</h3>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: T.textLight }}>{dose} \u2022 {time}</p>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: color }}>{compliance}%</div>
        <div style={{ fontSize: 11, color: T.textLight }}>Adhérence</div>
      </div>
    </div>
  );
}

export default function FamilyHealth({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState("meds");

  return (
    <Phone>
      <div style={{ padding: "24px 20px 100px", minHeight: "100vh", backgroundColor: "#F7F9FC", fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: T.navy }}>Traitements</h1>
            <p style={{ margin: 0, fontSize: 14, color: T.textLight }}>Gestion de l'armoire à pharmacie</p>
          </div>
          <button style={{
            width: 44, height: 44, borderRadius: 22, backgroundColor: T.primary, color: T.white,
            display: "flex", alignItems: "center", justifyContent: "center", border: "none", boxShadow: `0 4px 12px ${T.primary}40`, cursor: "pointer"
          }}>
            <Icon.Check active />
          </button>
        </div>

        {/* Custom Segmented Control */}
        <div style={{
          display: "flex", backgroundColor: "#E2E8F0", padding: 4, borderRadius: 12, marginBottom: 24
        }}>
          <button onClick={() => setActiveTab("meds")} style={{
            flex: 1, padding: "8px 0", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            backgroundColor: activeTab === "meds" ? T.white : "transparent",
            color: activeTab === "meds" ? T.navy : T.textLight,
            boxShadow: activeTab === "meds" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
          }}>Ordonnances</button>
          <button onClick={() => setActiveTab("history")} style={{
            flex: 1, padding: "8px 0", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            backgroundColor: activeTab === "history" ? T.white : "transparent",
            color: activeTab === "history" ? T.navy : T.textLight,
            boxShadow: activeTab === "history" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
          }}>Historique Pilulier</button>
        </div>

        {/* Content */}
        {activeTab === "meds" ? (
          <div>
             <h3 style={{ margin: "0 0 16px", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: T.textLight, fontWeight: 600 }}>Prises Quotidiennes</h3>
             <PillCard name="Previscan" dose="1 Comprimé" time="Matin (08:00)" compliance={95} />
             <PillCard name="Doliprane 1000" dose="1 Gélule" time="Midi (12:00)" compliance={100} />
             <PillCard name="Lévothyrox" dose="50 µg" time="Soir (20:00)" compliance={70} />

             <button style={{
               width: "100%", padding: 16, marginTop: 12, backgroundColor: "transparent", border: `2px dashed ${T.primary}60`,
               borderRadius: 16, color: T.primary, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "background-color 0.2s"
             }}>
               + Ajouter un nouveau médicament
             </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px", color: T.textLight }}>
             <Icon.Calendar size={48} />
             <h3 style={{ margin: "16px 0 8px", fontSize: 18, color: T.navy }}>Historique vide</h3>
             <p style={{ fontSize: 14, lineHeight: 1.5 }}>L'historique des pilules synchronisées apparaîtra ici après la première semaine.</p>
          </div>
        )}
      </div>
      <FamilyBottomNav activeTab="family_health" onNavigate={onNavigate} />
    </Phone>
  );
}
