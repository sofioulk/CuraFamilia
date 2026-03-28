import React, { useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { Icon } from "../../components/icons/Icons";

function AppointmentCard({ doctor, specialty, date, time }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px",
      backgroundColor: T.white,
      borderRadius: 16,
      marginBottom: 12,
      borderLeft: `4px solid ${T.primary}`,
      boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.navy }}>Dr. {doctor}</h3>
        <p style={{ margin: "2px 0 6px", fontSize: 13, color: T.textLight }}>{specialty}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.primary, fontSize: 12, fontWeight: 600 }}>
           <Icon.Calendar size={12} active={true} /> {date} \u2022 {time}
        </div>
      </div>
      <div>
        <button style={{
          padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.primary}40`, backgroundColor: "transparent",
          color: T.primary, fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}>
          Modifier
        </button>
      </div>
    </div>
  );
}

export default function FamilyCalendar({ user, onNavigate }) {
  return (
    <Phone>
      <div style={{ padding: "24px 20px 100px", minHeight: "100vh", backgroundColor: "#F7F9FC", fontFamily: "'Inter', sans-serif" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: T.navy }}>Agenda</h1>
            <p style={{ margin: 0, fontSize: 14, color: T.textLight }}>Rendez-vous médicaux</p>
          </div>
          <button style={{
             width: 44, height: 44, borderRadius: 22, backgroundColor: T.primary, color: T.white,
             display: "flex", alignItems: "center", justifyContent: "center", border: "none", boxShadow: `0 4px 12px ${T.primary}40`
          }}>
            <Icon.Check active /> {/* Or Plus icon */}
          </button>
        </div>

        {/* Mini Calendar Mock */}
        <div style={{
          backgroundColor: T.white, borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
        }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
             <h3 style={{ margin: 0, fontSize: 16, color: T.navy }}>Mai 2026</h3>
             <div style={{ display: "flex", gap: 12, color: T.textLight }}>
                {"<"} {">"}
             </div>
           </div>
           
           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: T.textLight, fontWeight: 600, textAlign: "center" }}>
             <span style={{flex: 1}}>L</span><span style={{flex: 1}}>M</span><span style={{flex: 1}}>M</span><span style={{flex: 1}}>J</span><span style={{flex: 1}}>V</span><span style={{flex: 1}}>S</span><span style={{flex: 1}}>D</span>
           </div>
           
           <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", fontWeight: 500, color: T.navy }}>
             <span style={{flex: 1, color: T.textLight}}>29</span>
             <span style={{flex: 1, color: T.textLight}}>30</span>
             <span style={{flex: 1}}>1</span>
             <span style={{flex: 1, backgroundColor: T.primary, color: T.white, borderRadius: 12, padding: "4px 0"}}>2</span>
             <span style={{flex: 1}}>3</span>
             <span style={{flex: 1}}>4</span>
             <span style={{flex: 1}}>5</span>
           </div>
        </div>

        <h3 style={{ margin: "0 0 16px", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: T.textLight, fontWeight: 600 }}>Prochains Visites</h3>
        
        <AppointmentCard doctor="Alaoui" specialty="Cardiologue" date="Mardi 12 Mai" time="14:30" />
        <AppointmentCard doctor="Benkirane" specialty="Ophtalmologue" date="Jeudi 28 Mai" time="09:00" />
        
      </div>
      <FamilyBottomNav activeTab="family_calendar" onNavigate={onNavigate} />
    </Phone>
  );
}
