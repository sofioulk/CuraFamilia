import React, { useState, useEffect } from "react";
import { T } from "../../styles/theme";
import { Phone } from "../../components/ui/Phone";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { Icon } from "../../components/icons/Icons";
import { getSeniorHome, parseSeniorIdFromUser } from "../../services/homeApi";

function CircularProgress({ percentage, color }) {
  const radius = 36;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = Math.max(0, circumference - (percentage / 100) * circumference);

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
        <span style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: "linear-gradient(90deg, #f0f4f8 25%, #e2e8f0 50%, #f0f4f8 75%)",
      backgroundSize: "200% 100%",
      animation: "pulse_shimmer 1.5s linear infinite",
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
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        // By default, try to parse from user, fallback to 2 for family linking simulation
        const sId = user?.linkedSeniorId || parseSeniorIdFromUser(user) || 2;
        const result = await getSeniorHome({ seniorId: sId });
        if (active) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Erreur lors du chargement des donnees.");
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => { active = false; };
  }, [user]);

  const seniorName = data?.senior?.name ? data.senior.name.split(" ")[0] : "Votre proche";
  const statusColor = data?.latestSosAlert ? "#EF4444" : T.primary;
  const statusText = data?.latestSosAlert ? "Alerte SOS" : "Statut Stable";

  // Calculate adherence percentage
  let adherence = 100;
  if (Array.isArray(data?.medications) && data.medications.length > 0) {
    const total = data.medications.length;
    const taken = data.medications.filter((m) => m.status === "taken" || m.takenAt).length;
    adherence = (taken / total) * 100;
  }

  // Format Check-in
  const latestAnswer = data?.dailyQuestions?.[0]?.latestAnswer || "Pas encore répondu";

  // Build Timeline Activities
  const activities = [];
  
  if (data?.latestSosAlert) {
    const d = new Date(data.latestSosAlert.triggeredAt || Date.now());
    activities.push({
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: d.getTime(),
      title: "Alerte SOS !",
      subtitle: data.latestSosAlert.comment || "Bouton SOS activé",
      icon: Icon.Activity,
      color: "#EF4444"
    });
  }

  if (Array.isArray(data?.medications)) {
    data.medications
      .filter((m) => m.status === "taken" && m.takenAt)
      .forEach((m) => {
        const d = new Date(m.takenAt);
        activities.push({
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: d.getTime(),
          title: "Traitement pris",
          subtitle: `${m.name} (${m.dosage})`,
          icon: Icon.Check,
          color: T.primary
        });
      });
  }

  if (data?.dailyQuestions && data.dailyQuestions.some(q => q.latestAnswer)) {
      activities.push({
        time: "Matin",
        timestamp: new Date().setHours(7,0,0,0), // sort fallback
        title: "Check-in matinal",
        subtitle: `A déclaré : ${latestAnswer}`,
        icon: Icon.Bot,
        color: "#F59E0B"
      });
  }

  activities.sort((a, b) => b.timestamp - a.timestamp);

  // Determine last activity string
  const lastAct = activities.length > 0 ? activities[0] : null;
  const lastActivityStr = lastAct ? lastAct.time : "--";

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
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => onNavigate("family_settings")}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: T.white,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                cursor: "pointer",
                color: T.navy
              }}
            >
              <Icon.Settings active />
            </button>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: T.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              color: T.navy
            }}>
              <Icon.Bell active />
            </div>
          </div>
        </div>

        {error && (
            <div style={{ backgroundColor: "#FEE2E2", color: "#DC2626", padding: 16, borderRadius: 12, marginBottom: 24, fontSize: 14 }}>
              {error}
            </div>
        )}

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : data && (
          <>
            {/* Main Status Card */}
            <div style={{
              backgroundColor: T.white,
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
              marginBottom: 24,
              border: `1px solid ${statusColor}20`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}` }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: statusColor }}>{statusText}</span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.navy }}>{seniorName}</h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <CircularProgress percentage={adherence} color={statusColor} />
                </div>
              </div>
              
              <div style={{ display: "flex", gap: 12, borderTop: "1px solid #edf2f7", paddingTop: 16 }}>
                <div style={{ flex: 1, backgroundColor: "#f8fafc", padding: 12, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: T.textLight, marginBottom: 4 }}>Check-in matinal</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {latestAnswer}
                  </div>
                </div>
                <div style={{ flex: 1, backgroundColor: "#f8fafc", padding: 12, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: T.textLight, marginBottom: 4 }}>Dernière activité</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>{lastActivityStr}</div>
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
              {activities.length > 0 ? (
                activities.map((act, idx) => (
                  <TimelineItem 
                    key={idx}
                    time={act.time} 
                    title={act.title} 
                    subtitle={act.subtitle} 
                    icon={act.icon} 
                    color={act.color} 
                    isLast={idx === activities.length - 1} 
                  />
                ))
              ) : (
                <p style={{ margin: 0, color: T.textLight, fontSize: 14 }}>Aucune activité signalée pour l'instant.</p>
              )}
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
