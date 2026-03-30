import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { getFamilyDashboard, getFamilyMoodTrend, getSeniorHome } from "../../services/homeApi";
import {
  formatFamilyDateTime,
  formatFamilyTime,
  getEffectiveFamilyUser,
  getFamilyFirstName,
  isMedicationTaken,
  normalizeAnswerLabel,
  resolveFamilySeniorId,
} from "./familyUtils";

const BODY_FONT = "'DM Sans', sans-serif";
const TITLE_FONT = "'DM Serif Display', serif";
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseTimestamp(value, fallback = Date.now()) {
  if (!value) return fallback;
  const text = String(value).trim();
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const [hours, minutes] = text.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date.getTime();
  }
  const parsed = new Date(text).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getMinutesDifference(value) {
  if (!value) return null;
  const timestamp = parseTimestamp(value, NaN);
  if (!Number.isFinite(timestamp)) return null;
  return Math.round((timestamp - Date.now()) / 60000);
}

function getRelativeTime(value) {
  const diff = getMinutesDifference(value);
  if (diff == null) return "--";
  if (Math.abs(diff) < 1) return "Maintenant";
  if (diff > 0 && diff < 60) return `Dans ${diff} min`;
  if (diff > 0) return `Dans ${Math.ceil(diff / 60)} h`;
  const past = Math.abs(diff);
  if (past < 60) return `Il y a ${past} min`;
  return `Il y a ${Math.ceil(past / 60)} h`;
}

function getLastSeen(value) {
  if (!value) return null;
  const diff = Math.abs(getMinutesDifference(value) ?? 9999);
  if (diff < 1) return { label: "A l'instant", fresh: true };
  if (diff < 30) return { label: `Il y a ${diff} min`, fresh: true };
  if (diff < 60) return { label: `Il y a ${diff} min`, fresh: false };
  return { label: `Il y a ${Math.ceil(diff / 60)} h`, fresh: false };
}

function getInitials(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bonjour";
  if (hour >= 12 && hour < 18) return "Bon apres-midi";
  return "Bonsoir";
}

function getNowLabel() {
  const now = new Date();
  const date = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date.charAt(0).toUpperCase()}${date.slice(1)} · ${time}`;
}

function evaluateCheckinTone(answer) {
  const normalized = String(answer || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) return { label: "Aucun check-in", mood: null, color: "#94A3B8" };
  if (normalized.includes("bien") || normalized.includes("oui") || normalized.includes("bon")) {
    return { label: "Bien", mood: "good", color: T.success };
  }
  if (normalized.includes("moyen") || normalized.includes("fatigue")) {
    return { label: "Moyen", mood: "mid", color: T.warning };
  }
  if (normalized.includes("non") || normalized.includes("mal") || normalized.includes("douleur")) {
    return { label: "A surveiller", mood: "hard", color: T.danger };
  }
  return { label: "Neutre", mood: "mid", color: T.primaryDark };
}

function computeGlobalScore({ adherence, mood, alerts }) {
  const moodScore = mood === "good" ? 100 : mood === "mid" ? 62 : mood === "hard" ? 22 : 52;
  const alertScore = alerts > 0 ? 0 : 100;
  // Mirrors backend: adherence 50%, mood+checkin_completion 40% (combined, no split available client-side), sos_safety 10%
  return clampPercent(adherence * 0.50 + moodScore * 0.40 + alertScore * 0.10);
}

function getPriority({ latestSos, pendingMeds, nextMed, nextApptAt }) {
  if (latestSos) {
    return {
      level: "critical",
      title: "SOS actif",
      text: "Contactez votre proche et consultez le journal.",
      cta: "Ouvrir assistant",
      route: "family_assistant",
    };
  }

  const medDelta = getMinutesDifference(nextMed?.scheduledAt);
  if (pendingMeds > 0 && medDelta != null && medDelta <= 90) {
    return {
      level: "attention",
      title: "Prise proche",
      text: `Medication prevue ${getRelativeTime(nextMed?.scheduledAt).toLowerCase()}.`,
      cta: "Voir traitements",
      route: "family_health",
    };
  }

  const apptDelta = getMinutesDifference(nextApptAt);
  if (apptDelta != null && apptDelta > 0 && apptDelta <= 24 * 60) {
    return {
      level: "attention",
      title: "Rendez-vous aujourd'hui",
      text: `Consultation ${getRelativeTime(nextApptAt).toLowerCase()}.`,
      cta: "Voir agenda",
      route: "family_calendar",
    };
  }

  return {
    level: "stable",
    title: "Situation stable",
    text: "Aucun signal critique detecte.",
    cta: "Verifier les soins",
    route: "family_health",
  };
}

function getPrioritySkin(level) {
  if (level === "critical") {
    return {
      chipBg: "#FEE2E2",
      chipColor: "#B91C1C",
      heroGlow: "rgba(239,68,68,0.34)",
      ring: "#FCA5A5",
      card: "linear-gradient(148deg, #0F766E 0%, #134E4A 56%, #0B3B39 100%)",
    };
  }
  if (level === "attention") {
    return {
      chipBg: "#FFEDD5",
      chipColor: "#C2410C",
      heroGlow: "rgba(249,115,22,0.25)",
      ring: "#FDBA74",
      card: "linear-gradient(148deg, #0E8D82 0%, #0C6D66 56%, #0A5250 100%)",
    };
  }
  return {
    chipBg: "#DCFCE7",
    chipColor: "#166534",
    heroGlow: "rgba(34,197,94,0.22)",
    ring: "#86EFAC",
    card: "linear-gradient(148deg, #0D9488 0%, #0A7C71 56%, #085C55 100%)",
  };
}

function buildTimeline({ latestSos, meds, latestCheckin, answeredAt, tone, nextAppt, nextApptAt }) {
  const rows = [];

  if (latestSos) {
    rows.push({
      id: "sos",
      type: "sos",
      title: "Alerte SOS",
      details: latestSos.comment || "Alerte declenchee par le senior.",
      stamp: formatFamilyDateTime(latestSos.triggeredAt),
      at: parseTimestamp(latestSos.triggeredAt),
    });
  }

  meds.forEach((medication, index) => {
    if (isMedicationTaken(medication)) {
      rows.push({
        id: `med-taken-${medication?.id ?? index}`,
        type: "taken",
        title: "Medication prise",
        details: [medication?.name || "Medication", medication?.dosage ? `· ${medication.dosage}` : null]
          .filter(Boolean)
          .join(" "),
        stamp: formatFamilyTime(medication?.takenAt || medication?.time),
        at: parseTimestamp(medication?.takenAt || medication?.time),
      });
    } else {
      rows.push({
        id: `med-pending-${medication?.id ?? index}`,
        type: "pending",
        title: `${medication?.name || "Medication"} en attente`,
        details: medication?.time ? `Prise prevue a ${medication.time}` : "En attente de confirmation",
        stamp: medication?.time || "--",
        at: parseTimestamp(medication?.time, Date.now() + 60000 * (index + 1)),
      });
    }
  });

  if (latestCheckin?.latestAnswer) {
    rows.push({
      id: "checkin",
      type: "checkin",
      title: "Check-in du jour",
      details: `Humeur ${tone.label} · "${normalizeAnswerLabel(latestCheckin.latestAnswer)}"`,
      stamp: formatFamilyTime(answeredAt || Date.now()),
      at: parseTimestamp(answeredAt, Date.now() - 120000),
    });
  }

  if (nextAppt && nextApptAt) {
    rows.push({
      id: "appointment",
      type: "appointment",
      title: "Rendez-vous medical",
      details: nextAppt?.doctorName || nextAppt?.specialty || "Consultation programmee",
      stamp: formatFamilyDateTime(nextApptAt),
      at: parseTimestamp(nextApptAt),
    });
  }

  return rows.sort((left, right) => right.at - left.at).slice(0, 10);
}

function TopBar({ greeting, viewerName, dateLabel, hasUnread, onNotificationsClick }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        background: "rgba(236,248,245,0.84)",
        borderBottom: "1px solid rgba(19,78,74,0.10)",
        padding: "10px 16px 11px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {dateLabel}
          </div>
          <div
            style={{
              marginTop: 2,
              color: "var(--ink)",
              fontFamily: TITLE_FONT,
              fontSize: 19,
              lineHeight: 1.1,
              fontWeight: 400,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {greeting}, {viewerName}
          </div>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          onClick={onNotificationsClick}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            border: "1px solid rgba(19,78,74,0.12)",
            background: "rgba(255,255,255,0.86)",
            color: "var(--ink)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(13,148,136,0.12)",
            flexShrink: 0,
          }}
        >
          <span style={{ position: "relative", display: "inline-flex" }}>
            <Icon.BellSmall />
            {hasUnread ? (
              <span
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#EF4444",
                  border: "1px solid white",
                  animation: "pulse 1.25s ease-in-out infinite",
                }}
              />
            ) : null}
          </span>
        </button>
      </div>
    </div>
  );
}

function PriorityHero({
  seniorName,
  priority,
  score,
  adherence,
  pendingMeds,
  tone,
  onPrimaryClick,
}) {
  const skin = getPrioritySkin(priority.level);
  const progressStyle = {
    background: `conic-gradient(${skin.ring} ${score * 3.6}deg, rgba(255,255,255,0.18) 0deg)`,
  };

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        padding: "16px 16px 18px",
        background: skin.card,
        color: "white",
        boxShadow: `0 24px 46px ${skin.heroGlow}`,
        animation: "fadeUp .42s both",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -70,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 68%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -90,
          left: -50,
          width: 170,
          height: 170,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 72%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 999,
            background: skin.chipBg,
            color: skin.chipColor,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: skin.chipColor,
              animation: "pulse 1.25s ease-in-out infinite",
            }}
          />
          {priority.title}
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontFamily: TITLE_FONT,
                fontSize: 29,
                lineHeight: 1.04,
                fontWeight: 400,
                marginBottom: 7,
                letterSpacing: "-0.01em",
              }}
            >
              Vue rapide de {seniorName}
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.52, color: "rgba(255,255,255,0.86)" }}>{priority.text}</p>
          </div>

          <div style={{ width: 108, flexShrink: 0, display: "grid", placeItems: "center", paddingTop: 2 }}>
            <div
              style={{
                width: 94,
                height: 94,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                ...progressStyle,
                boxShadow: "0 8px 22px rgba(15,23,42,0.28)",
              }}
            >
              <div
                style={{
                  width: 71,
                  height: 71,
                  borderRadius: "50%",
                  background: "rgba(9,24,22,0.38)",
                  border: "1px solid rgba(255,255,255,0.30)",
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  backdropFilter: "blur(3px)",
                }}
              >
                <strong style={{ fontSize: 20, lineHeight: 1, fontWeight: 900 }}>{score}%</strong>
                <span style={{ marginTop: 2, fontSize: 9, fontWeight: 700, letterSpacing: ".04em", opacity: 0.82 }}>
                  GLOBAL
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <div
            style={{
              borderRadius: 13,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.20)",
              padding: "8px 8px 7px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{adherence}%</div>
            <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, opacity: 0.84 }}>Observance</div>
          </div>
          <div
            style={{
              borderRadius: 13,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.20)",
              padding: "8px 8px 7px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{pendingMeds}</div>
            <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, opacity: 0.84 }}>A confirmer</div>
          </div>
          <div
            style={{
              borderRadius: 13,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.20)",
              padding: "8px 8px 7px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{tone.label}</div>
            <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, opacity: 0.84 }}>Dernier check-in</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onPrimaryClick}
          style={{
            marginTop: 12,
            width: "100%",
            border: "1px solid rgba(255,255,255,0.32)",
            borderRadius: 13,
            background: "rgba(255,255,255,0.16)",
            color: "white",
            padding: "10px 12px",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
          }}
        >
          {priority.cta}
          <Icon.ArrowRight />
        </button>
      </div>
    </section>
  );
}

function QuickActions({ onNavigate }) {
  const actions = [
    { id: "family_health", label: "Traitements", icon: Icon.Pill, bg: "#ECFEFF", color: "#0F766E" },
    { id: "family_calendar", label: "Agenda", icon: Icon.Calendar, bg: "#F0F9FF", color: "#0369A1" },
    { id: "family_assistant", label: "Assistant", icon: Icon.Bot, bg: "#F5F3FF", color: "#6D28D9" },
  ];

  return (
    <section style={{ marginTop: 13, animation: "fadeUp .42s .05s both" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 9 }}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onNavigate(action.id)}
            style={{
              border: "1px solid rgba(15,23,42,0.06)",
              borderRadius: 15,
              background: "rgba(255,255,255,0.94)",
              boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
              padding: "11px 8px 10px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 7,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 82,
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                background: action.bg,
                color: action.color,
                display: "grid",
                placeItems: "center",
              }}
            >
              <action.icon active />
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ink)" }}>{action.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SeniorCard({
  senior,
  seniorName,
  weekAdh,
  alertsActive,
  nextMedication,
  nextAppointment,
  nextAppointmentAt,
  onCall,
  canCall,
  onNavigate,
}) {
  const initials = getInitials(seniorName);
  const lastSeen = getLastSeen(senior?.lastActiveAt || senior?.lastCheckinAt);
  const subtitle = [senior?.age ? `${senior.age} ans` : null, senior?.city, senior?.diagnosis].filter(Boolean).join(" · ");

  return (
    <section
      style={{
        marginTop: 13,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(15,23,42,0.06)",
        borderRadius: 20,
        padding: "13px 13px 12px",
        boxShadow: "0 12px 26px rgba(15,23,42,0.07)",
        animation: "fadeUp .42s .09s both",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "linear-gradient(145deg, #0D9488, #0A7C71)",
              color: "white",
              fontSize: 17,
              fontWeight: 900,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 17, lineHeight: 1.18, color: "var(--ink)", fontWeight: 900 }}>{seniorName}</h3>
            {subtitle ? (
              <p
                style={{
                  marginTop: 3,
                  fontSize: 11.5,
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onCall}
          disabled={!canCall}
          style={{
            alignSelf: "flex-start",
            borderRadius: 11,
            border: "1px solid rgba(13,148,136,0.20)",
            background: canCall ? "#ECFEFF" : "#E2E8F0",
            color: canCall ? "#0F766E" : "#64748B",
            minWidth: 84,
            padding: "8px 10px",
            fontSize: 11.5,
            fontWeight: 800,
            cursor: canCall ? "pointer" : "not-allowed",
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Icon.Phone />
          Appeler
        </button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <div style={{ borderRadius: 13, background: "#F8FAFC", padding: "9px 10px" }}>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>Adherence semaine</div>
          <div style={{ marginTop: 3, fontSize: 17, color: "var(--ink)", fontWeight: 900 }}>{weekAdh}%</div>
        </div>
        <div style={{ borderRadius: 13, background: "#F8FAFC", padding: "9px 10px" }}>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>Alertes actives</div>
          <div style={{ marginTop: 3, fontSize: 17, color: alertsActive ? T.danger : T.success, fontWeight: 900 }}>
            {alertsActive}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <strong style={{ fontSize: 12, color: "var(--ink)" }}>Prochaine medication</strong>
          <button
            type="button"
            onClick={() => onNavigate("family_health")}
            style={{
              border: "none",
              background: "transparent",
              color: T.primaryDark,
              fontSize: 11.5,
              fontWeight: 800,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Ouvrir
          </button>
        </div>
        <p style={{ marginTop: 3, fontSize: 12, color: "var(--soft)", lineHeight: 1.45 }}>
          {nextMedication?.name
            ? `${nextMedication.name} · ${nextMedication?.time || "--:--"} (${getRelativeTime(nextMedication?.scheduledAt)})`
            : "Aucune prise en attente."}
        </p>
      </div>

      <div style={{ marginTop: 9 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <strong style={{ fontSize: 12, color: "var(--ink)" }}>Prochain rendez-vous</strong>
          <button
            type="button"
            onClick={() => onNavigate("family_calendar")}
            style={{
              border: "none",
              background: "transparent",
              color: T.primaryDark,
              fontSize: 11.5,
              fontWeight: 800,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Voir agenda
          </button>
        </div>
        <p style={{ marginTop: 3, fontSize: 12, color: "var(--soft)", lineHeight: 1.45 }}>
          {nextAppointmentAt
            ? `${nextAppointment?.doctorName || nextAppointment?.specialty || "Consultation"} · ${formatFamilyDateTime(nextAppointmentAt)}`
            : "Aucun rendez-vous programme."}
        </p>
      </div>

      {lastSeen ? (
        <div
          style={{
            marginTop: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            borderRadius: 999,
            padding: "4px 9px",
            background: "#F0FDFA",
            border: "1px solid #CCFBF1",
            fontSize: 10.5,
            color: "var(--muted)",
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: lastSeen.fresh ? "#22C55E" : "#94A3B8",
              animation: lastSeen.fresh ? "pulse 1.25s ease-in-out infinite" : "none",
            }}
          />
          Actif {lastSeen.label}
        </div>
      ) : null}
    </section>
  );
}

function MoodWeek({ moodWeek, tone }) {
  const todayIndex = (new Date().getDay() + 6) % 7;
  const colorMap = { good: T.success, mid: T.warning, hard: T.danger };

  return (
    <section
      style={{
        marginTop: 13,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(15,23,42,0.06)",
        borderRadius: 20,
        padding: "13px 13px 12px",
        boxShadow: "0 12px 26px rgba(15,23,42,0.07)",
        animation: "fadeUp .42s .13s both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ fontSize: 14, color: "var(--ink)", fontWeight: 900 }}>Humeur sur 7 jours</h3>
        <span style={{ fontSize: 11.5, color: tone.color, fontWeight: 800 }}>{tone.label}</span>
      </div>

      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
        {DAY_LABELS.map((day, index) => {
          const mood = moodWeek?.[index] || null;
          const isToday = index === todayIndex;
          return (
            <div
              key={`${day}-${index}`}
              style={{
                borderRadius: 12,
                border: isToday ? "1px solid #99F6E4" : "1px solid rgba(15,23,42,0.06)",
                background: isToday ? "#ECFEFF" : "#F8FAFC",
                padding: "8px 4px 7px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: mood ? colorMap[mood] : "#CBD5E1",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: isToday ? "var(--ink)" : "var(--muted)",
                  fontWeight: isToday ? 800 : 700,
                }}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InsightCard({ priority, tone, adherence, pendingMeds, nextApptAt, isNetworkError, onNavigate }) {
  let text = "";
  if (isNetworkError) {
    text = "Connexion instable. Les donnees IA peuvent etre en retard, mais les soins restent accessibles.";
  } else if (priority.level === "critical") {
    text = "Priorite immediate: traiter l'alerte SOS puis verifier les derniers echanges assistant.";
  } else if (pendingMeds > 0) {
    text = `Observance actuelle ${adherence}%. Il reste ${pendingMeds} prise(s) a confirmer aujourd'hui.`;
  } else if (nextApptAt) {
    text = `Prochaine consultation ${getRelativeTime(nextApptAt).toLowerCase()}. Pensez a preparer les documents.`;
  } else {
    text = "Journee calme: maintenir le rythme des controles et consulter le journal IA en fin de journee.";
  }

  return (
    <section
      style={{
        marginTop: 13,
        background: "linear-gradient(140deg, #ECFEFF 0%, #F0F9FF 48%, #F8FAFC 100%)",
        border: "1px solid rgba(14,165,233,0.18)",
        borderRadius: 20,
        padding: "13px 13px 12px",
        boxShadow: "0 12px 26px rgba(14,165,233,0.12)",
        animation: "fadeUp .42s .16s both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ fontSize: 14, color: "var(--ink)", fontWeight: 900 }}>Synthese du jour</h3>
        <button
          type="button"
          onClick={() => onNavigate("family_assistant")}
          style={{
            border: "none",
            background: "transparent",
            color: "#0369A1",
            fontSize: 11.5,
            fontWeight: 800,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Ouvrir assistant
        </button>
      </div>

      <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.58, color: "var(--soft)" }}>{text}</p>

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            borderRadius: 999,
            background: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(14,165,233,0.18)",
            padding: "4px 8px",
            fontSize: 10.5,
            fontWeight: 800,
            color: "#0369A1",
          }}
        >
          Etat
          <strong>{priority.title}</strong>
        </span>
        <span style={{ fontSize: 11, color: tone.color, fontWeight: 800 }}>Humeur: {tone.label}</span>
      </div>
    </section>
  );
}

function TimelineCard({ rows, loading, error, isNetworkError, onRefresh }) {
  const typeColor = {
    sos: T.danger,
    pending: T.warning,
    taken: T.success,
    checkin: "#0284C7",
    appointment: T.primaryDark,
  };

  return (
    <section
      style={{
        marginTop: 13,
        background: "rgba(255,255,255,0.97)",
        border: "1px solid rgba(15,23,42,0.06)",
        borderRadius: 20,
        padding: "13px 13px 14px",
        boxShadow: "0 12px 26px rgba(15,23,42,0.07)",
        animation: "fadeUp .42s .20s both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ fontSize: 14, color: "var(--ink)", fontWeight: 900 }}>Fil de la journee</h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            borderRadius: 10,
            border: "1px solid rgba(15,23,42,0.10)",
            background: "white",
            padding: "5px 9px",
            fontSize: 11.5,
            fontWeight: 800,
            color: "var(--ink)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading ? "Sync..." : "Actualiser"}
        </button>
      </div>

      {error && !isNetworkError ? (
        <div
          style={{
            marginTop: 10,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 11,
            padding: "8px 10px",
            fontSize: 12,
            color: T.danger,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      {!rows.length ? (
        <div style={{ marginTop: 10, padding: "14px 0 8px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "#F1F5F9",
              color: "var(--muted)",
            }}
          >
            <Icon.Mic />
          </div>
          <p style={{ marginTop: 8, fontSize: 12.5, color: "var(--muted)" }}>Aucune activite remontee pour le moment.</p>
        </div>
      ) : (
        <div style={{ marginTop: 11 }}>
          {rows.map((row, index) => (
            <div key={row.id} style={{ display: "flex", gap: 9, paddingBottom: index === rows.length - 1 ? 0 : 12 }}>
              <div style={{ width: 11, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: typeColor[row.type] || "#94A3B8",
                    boxShadow: `0 0 0 3px ${(typeColor[row.type] || "#94A3B8")}22`,
                    marginTop: 4,
                    zIndex: 2,
                  }}
                />
                {index < rows.length - 1 ? (
                  <span style={{ width: 2, flex: 1, background: "#E2E8F0", marginTop: 4 }} />
                ) : null}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.35 }}>{row.title}</strong>
                  <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {row.stamp}
                  </span>
                </div>
                <p style={{ marginTop: 2, fontSize: 12, color: "var(--soft)", lineHeight: 1.5 }}>{row.details}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ onNavigate }) {
  return (
    <section
      style={{
        marginTop: 12,
        borderRadius: 22,
        border: "1px solid rgba(15,23,42,0.08)",
        background: "rgba(255,255,255,0.96)",
        padding: "18px 16px 16px",
        boxShadow: "0 18px 38px rgba(15,23,42,0.08)",
        animation: "fadeUp .44s both",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(145deg, #0D9488, #0A7C71)",
          color: "white",
          marginBottom: 11,
        }}
      >
        <Icon.Users />
      </div>
      <h2 style={{ color: "var(--ink)", fontFamily: TITLE_FONT, fontSize: 27, lineHeight: 1.08, fontWeight: 400 }}>
        Aucun proche relie
      </h2>
      <p style={{ marginTop: 7, color: "var(--soft)", fontSize: 13.5, lineHeight: 1.6 }}>
        Associez un senior dans Reglages pour activer le tableau de suivi famille.
      </p>

      <button
        type="button"
        onClick={() => onNavigate("family_settings")}
        style={{
          marginTop: 12,
          border: "none",
          borderRadius: 13,
          background: "linear-gradient(140deg, #0D9488 0%, #0A7C71 100%)",
          color: "white",
          fontSize: 13,
          fontWeight: 800,
          padding: "11px 14px",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Aller aux Reglages
        <Icon.ArrowRight />
      </button>
    </section>
  );
}

export default function FamilyDashboard({ user, onNavigate = () => {} }) {
  const effectiveUser = useMemo(() => getEffectiveFamilyUser(user), [user]);
  const seniorId = useMemo(() => resolveFamilySeniorId(effectiveUser), [effectiveUser]);

  const [homeData, setHomeData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [moodTrend, setMoodTrend] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [dateLabel, setDateLabel] = useState(getNowLabel);
  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDateLabel(getNowLabel());
      setGreeting(getGreeting());
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const loadHome = useCallback(async () => {
    if (!seniorId) {
      setHomeData(null);
      setLoading(false);
      setError("");
      setOffline(false);
      return;
    }

    setLoading(true);
    setError("");
    setOffline(false);
    try {
      const data = await getSeniorHome({ seniorId });
      setHomeData(data);
    } catch (loadError) {
      const message = String(loadError?.message || "");
      const network =
        message.toLowerCase().includes("impossible de joindre") ||
        message.toLowerCase().includes("failed to fetch");
      setOffline(network);
      if (!network) {
        setError(message || "Impossible de charger le suivi.");
      }
    } finally {
      setLoading(false);
    }
  }, [seniorId]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  useEffect(() => {
    if (!seniorId) {
      setDashboardData(null);
      setMoodTrend(null);
      return;
    }
    getFamilyDashboard({ seniorId })
      .then(setDashboardData)
      .catch(() => setDashboardData(null));
    getFamilyMoodTrend({ seniorId, days: 7 })
      .then(setMoodTrend)
      .catch(() => setMoodTrend(null));
  }, [seniorId]);

  const medications = useMemo(
    () => (Array.isArray(homeData?.medications) ? homeData.medications : []),
    [homeData?.medications]
  );

  const totalMeds = medications.length;
  const takenMeds = medications.filter(isMedicationTaken).length;
  const pendingMeds = Math.max(0, totalMeds - takenMeds);
  const adherence = totalMeds > 0 ? clampPercent((takenMeds / totalMeds) * 100) : 0;
  const weekAdh = useMemo(() => {
    const fromDashboard = Number.parseFloat(dashboardData?.kpis?.adherence7dPercentage);
    if (Number.isFinite(fromDashboard)) return clampPercent(fromDashboard);
    const fromHome = Number.parseFloat(homeData?.weekAdherence);
    return Number.isFinite(fromHome) ? clampPercent(fromHome) : adherence;
  }, [dashboardData?.kpis?.adherence7dPercentage, homeData?.weekAdherence, adherence]);

  const seniorName = homeData?.senior?.name || dashboardData?.hero?.name || "Votre proche";
  const viewerName = getFamilyFirstName(effectiveUser?.name, "Famille");

  const latestSos = homeData?.latestSosAlert || null;
  const nextMedication = homeData?.nextMedication || null;
  const nextAppointment = homeData?.nextAppointment || null;
  const appointmentAt = nextAppointment?.appointmentAt || nextAppointment?.scheduledAt || null;
  const dailyQuestions = useMemo(
    () => (Array.isArray(homeData?.dailyQuestions) ? homeData.dailyQuestions : []),
    [homeData?.dailyQuestions]
  );
  const latestCheckin = useMemo(() => {
    const answered = dailyQuestions.filter((item) => String(item?.latestAnswer || "").trim());
    if (!answered.length) return null;
    return [...answered].sort((left, right) => {
      const leftTs = parseTimestamp(left?.latestAnsweredAt || left?.updatedAt, 0);
      const rightTs = parseTimestamp(right?.latestAnsweredAt || right?.updatedAt, 0);
      return rightTs - leftTs;
    })[0];
  }, [dailyQuestions]);
  const answeredAt = latestCheckin?.latestAnsweredAt || latestCheckin?.updatedAt || null;

  const tone = evaluateCheckinTone(latestCheckin?.latestAnswer);
  const alertsActive = latestSos ? 1 : 0;
  const score = useMemo(() => {
    const fromDashboard = Number.parseInt(dashboardData?.kpis?.healthScore, 10);
    if (Number.isFinite(fromDashboard)) return clampPercent(fromDashboard);
    return computeGlobalScore({ adherence, mood: tone.mood, alerts: alertsActive });
  }, [dashboardData?.kpis?.healthScore, adherence, tone.mood, alertsActive]);

  const priority = useMemo(
    () => getPriority({ latestSos, pendingMeds, nextMed: nextMedication, nextApptAt: appointmentAt }),
    [latestSos, pendingMeds, nextMedication, appointmentAt]
  );

  const moodWeek = useMemo(() => {
    const week = Array(7).fill(null);
    const timeline = Array.isArray(moodTrend?.timeline) ? moodTrend.timeline : [];
    for (const day of timeline) {
      if (!day?.date) continue;
      const date = new Date(day.date);
      if (Number.isNaN(date.getTime())) continue;
      const index = (date.getDay() + 6) % 7;
      const mood = day.latestAnswer
        ? evaluateCheckinTone(day.latestAnswer).mood
        : day.moodScore != null
          ? day.moodScore <= 0.33 ? "good" : day.moodScore <= 0.66 ? "mid" : "hard"
          : null;
      if (mood) week[index] = mood;
    }
    // Fallback: if the trend API had no data for today, use the home check-in tone
    const todayIndex = (new Date().getDay() + 6) % 7;
    if (!week[todayIndex] && tone.mood) {
      week[todayIndex] = tone.mood;
    }
    return week;
  }, [moodTrend, tone.mood]);

  const timelineRows = useMemo(
    () =>
      buildTimeline({
        latestSos,
        meds: medications,
        latestCheckin,
        answeredAt,
        tone,
        nextAppt: nextAppointment,
        nextApptAt: appointmentAt,
      }),
    [latestSos, medications, latestCheckin, answeredAt, tone, nextAppointment, appointmentAt]
  );

  const seniorPhone = homeData?.senior?.phone || null;
  const canCall = Boolean(seniorPhone);

  const handleCall = () => {
    if (!seniorPhone) return;
    window.location.href = `tel:${seniorPhone}`;
  };

  const hasUnread = alertsActive > 0 || pendingMeds > 0;
  const isNetworkError = offline || error.toLowerCase().includes("impossible de joindre");

  return (
    <Phone bg="#ECF8F5">
      <div
        style={{
          "--ink": "#0D3B39",
          "--soft": "#1E5A56",
          "--muted": "#5A8682",
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 5% 2%, rgba(153,246,228,0.45) 0%, rgba(153,246,228,0) 32%), radial-gradient(circle at 95% 18%, rgba(125,211,252,0.28) 0%, rgba(125,211,252,0) 33%), #ECF8F5",
          fontFamily: BODY_FONT,
          color: "var(--ink)",
          position: "relative",
        }}
      >
        {isNetworkError ? (
          <div
            style={{
              background: "#FEF2F2",
              borderBottom: "1px solid #FECACA",
              color: T.danger,
              fontSize: 11.5,
              fontWeight: 700,
              padding: "7px 16px",
              textAlign: "center",
            }}
          >
            Connexion backend temporairement indisponible.
          </div>
        ) : null}

        <TopBar
          greeting={greeting}
          viewerName={viewerName}
          dateLabel={dateLabel}
          hasUnread={hasUnread}
          onNotificationsClick={() => onNavigate("family_assistant")}
        />

        <main style={{ padding: "12px 14px 112px" }}>
          {!seniorId ? (
            <EmptyState onNavigate={onNavigate} />
          ) : (
            <>
              <PriorityHero
                seniorName={seniorName}
                priority={priority}
                score={score}
                adherence={adherence}
                pendingMeds={pendingMeds}
                tone={tone}
                onPrimaryClick={() => onNavigate(priority.route)}
              />

              <QuickActions onNavigate={onNavigate} />

              <SeniorCard
                senior={homeData?.senior || {}}
                seniorName={seniorName}
                weekAdh={weekAdh}
                alertsActive={alertsActive}
                nextMedication={nextMedication}
                nextAppointment={nextAppointment}
                nextAppointmentAt={appointmentAt}
                onCall={handleCall}
                canCall={canCall}
                onNavigate={onNavigate}
              />

              <MoodWeek moodWeek={moodWeek} tone={tone} />

              <InsightCard
                priority={priority}
                tone={tone}
                adherence={adherence}
                pendingMeds={pendingMeds}
                nextApptAt={appointmentAt}
                isNetworkError={isNetworkError}
                onNavigate={onNavigate}
              />

              <TimelineCard
                rows={timelineRows}
                loading={loading}
                error={error}
                isNetworkError={isNetworkError}
                onRefresh={loadHome}
              />
            </>
          )}
        </main>

        <FamilyBottomNav activeTab="family_dashboard" onNavigate={onNavigate} />
      </div>
    </Phone>
  );
}
