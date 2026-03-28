import React from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { Icon } from "../../components/icons/Icons";

function AiLog({ title, date, snippet, sentiment, urgency }) {
  const isUrgent = urgency === "high";
  const sentimentColor = sentiment === "positive" ? "#10B981" : sentiment === "negative" ? "#EF4444" : "#F59E0B";
  const sentimentBg = sentiment === "positive" ? "#10B98115" : sentiment === "negative" ? "#EF444415" : "#F59E0B15";

  return (
    <div style={{
      backgroundColor: T.white,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      boxShadow: "0 2px 16px rgba(0,0,0,0.03)",
      border: isUrgent ? `2px solid #EF444450` : `1px solid rgba(0,0,0,0.04)`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
           <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sentimentColor }} />
           <span style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{title}</span>
         </div>
         <span style={{ fontSize: 12, color: T.textLight }}>{date}</span>
      </div>
      
      <p style={{ margin: "0 0 16px", fontSize: 14, color: T.text, lineHeight: 1.5, fontStyle: "italic", borderLeft: `3px solid #E2E8F0`, paddingLeft: 12 }}>
        "{snippet}"
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <span style={{
          backgroundColor: sentimentBg,
          color: sentimentColor,
          padding: "4px 10px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600
        }}>Analyse: {sentiment === "positive" ? "Serein" : sentiment === "negative" ? "Douleur/Stress" : "Neutre"}</span>
        
        {isUrgent && (
           <span style={{
            backgroundColor: "#EF444415",
            color: "#EF4444",
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700
          }}>Intervention requise</span>
        )}
      </div>
    </div>
  );
}

export default function FamilyAssistant({ user, onNavigate }) {
  return (
    <Phone>
      <div style={{ padding: "24px 20px 100px", minHeight: "100vh", backgroundColor: "#F7F9FC", fontFamily: "'Inter', sans-serif" }}>
        
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${T.primary}20`, display: "flex", justifyContent: "center", alignItems: "center", color: T.primary }}>
            <Icon.Bot size={24} active />
          </div>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: T.navy }}>Journal IA</h1>
            <p style={{ margin: 0, fontSize: 14, color: T.textLight }}>Historique des conversations</p>
          </div>
        </div>

        <div style={{ backgroundColor: "#E2E8F060", borderRadius: 12, padding: 16, marginBottom: 24 }}>
           <p style={{ margin: 0, fontSize: 13, color: T.navy, lineHeight: 1.5 }}>
             ℹ L'Eldercare IA résume de manière anonyme et confidentielle l'état psychologique et physique de votre proche après chaque discussion.
           </p>
        </div>

        <h3 style={{ margin: "0 0 16px", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: T.textLight, fontWeight: 600 }}>Aujourd'hui</h3>
        
        <AiLog 
          title="Réveil et Check-in" 
          date="08:15" 
          snippet="Bonjour l'assistant, j'ai plutôt bien dormi. Mon dos me fait un peu souffrir ce matin par contre."
          sentiment="negative"
          urgency="low"
        />

        <AiLog 
          title="Questions Médicaments" 
          date="13:30" 
          snippet="Est-ce que j'ai pris mon doliprane ce midi ?"
          sentiment="neutral"
          urgency="low"
        />

        <h3 style={{ margin: "24px 0 16px", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: T.textLight, fontWeight: 600 }}>Hier</h3>
        
        <AiLog 
          title="Fin de journée" 
          date="20:00" 
          snippet="Tout va bien, j'ai hâte de voir Sofia ce week-end. Je vais me coucher."
          sentiment="positive"
          urgency="low"
        />

      </div>
      <FamilyBottomNav activeTab="family_assistant" onNavigate={onNavigate} />
    </Phone>
  );
}
