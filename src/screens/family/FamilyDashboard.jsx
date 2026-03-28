import React, { useState, useEffect } from "react";
import { T } from "../../styles/theme";
import { Phone } from "../../components/ui/Phone";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { Icon } from "../../components/icons/Icons";

function CircularProgress({ percentage, color }) {
  const radius = 36;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: "relative", width: radius * 2, height: radius * 2 }}>
      <svg height={radius * 2} width={radius * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle
          stroke={`${color}20`}
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 1s ease-in-out" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column"
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>{percentage}%</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: "linear-gradient(90deg, #f0f4f8 25%, #e2e8f0 50%, #f0f4f8 75%)",
      backgroundSize: "200% 100%",
      animation: "pulse_shimmer 1.5s infinite",
      borderRadius: 16,
      height: 120,
      width: "100%",
      marginBottom: 16
    }} />
  );
}

function TimelineItem({ time, title, subtitle, icon: ItemIcon, color, isLast }) {
  return (
    <div style={{ display: "flex", gap: 16, position: "relative", marginBottom: isLast ? 0 : 20 }}>
      {!isLast && (
        <div style={{
          position: "absolute",
          left: 17,
          top: 40,
          bottom: -20,
          width: 2,
          backgroundColor: `${color}30`
        }} />
      )}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${color}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: color,
        zIndex: 2,
        flexShrink: 0
      }}>
        <ItemIcon active size={18} />
      </div>
      <div style={{ flex: 1, paddingBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.navy }}>{title}</h4>
          <span style={{ fontSize: 12, color: T.textLight, fontWeight: 500 }}>{time}</span>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: T.text, lineHeight: 1.4 }}>{subtitle}</p>
      </div>
    </div>
  );
}

export default function FamilyDashboard({ user, onNavigate }) {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate API fetch delay for professional skeleton loading
    const t = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

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
            <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: T.navy }}>
              Bonjour, {user?.name?.split(" ")[0] || "Famille"}
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: T.textLight }}>
              Aperçu santé de vos proches
            </p>
          </div>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: T.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <Icon.Bell active />
          </div>
        </div>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Main Status Card */}
            <div style={{
              backgroundColor: T.white,
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
              marginBottom: 24,
              border: `1px solid ${T.primary}20`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: T.primary, boxShadow: `0 0 10px ${T.primary}` }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.primary }}>Statut Stable</span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.navy }}>Sofia (Maman)</h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <CircularProgress percentage={100} color={T.primary} />
                </div>
              </div>
              
              <div style={{ display: "flex", gap: 12, borderTop: "1px solid #edf2f7", paddingTop: 16 }}>
                <div style={{ flex: 1, backgroundColor: "#f8fafc", padding: 12, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: T.textLight, marginBottom: 4 }}>Check-in matinal</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>En pleine forme 😄</div>
                </div>
                <div style={{ flex: 1, backgroundColor: "#f8fafc", padding: 12, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: T.textLight, marginBottom: 4 }}>Dernière activité</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>Il y a 10 min</div>
                </div>
              </div>
            </div>

            {/* Timeline Feed */}
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: T.navy }}>Activité récente</h3>
            <div style={{
              backgroundColor: T.white,
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 4px 24px rgba(0,0,0,0.04)"
            }}>
              <TimelineItem 
                time="10:30" 
                title="Interaction IA" 
                subtitle="A écouté son rappel pour boire de l'eau." 
                icon={Icon.Bot} 
                color="#8B5CF6" 
              />
              <TimelineItem 
                time="08:00" 
                title="Traitement pris" 
                subtitle="Previscan, Doliprane (Matin)" 
                icon={Icon.Check} 
                color={T.primary} 
              />
              <TimelineItem 
                time="07:45" 
                title="Réveil & Check-in" 
                subtitle="A déclaré : Bien dormi, aucune douleur." 
                icon={Icon.Activity} 
                color="#F59E0B"
                isLast 
              />
            </div>
          </>
        )}
      </div>

      <FamilyBottomNav activeTab="family_dashboard" onNavigate={onNavigate} />

      <style>{`
        @keyframes pulse_shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </Phone>
  );
}
