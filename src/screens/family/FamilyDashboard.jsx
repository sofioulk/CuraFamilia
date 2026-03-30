import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { getSeniorHome } from "../../services/homeApi";
import {
  formatFamilyDate,
  formatFamilyDateTime,
  formatFamilyTime,
  getEffectiveFamilyUser,
  getFamilyFirstName,
  isMedicationTaken,
  normalizeAnswerLabel,
  resolveFamilySeniorId,
  sortByDateDesc,
} from "./familyUtils";

const PAGE_BODY_FONT = "'DM Sans', sans-serif";
const PAGE_TITLE_FONT = "'DM Serif Display', serif";
const TIMELINE_FILTERS = [
  { id: "all", label: "Tout" },
  { id: "priority", label: "Priorite" },
  { id: "medical", label: "Medical" },
];

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function parseEventTimestamp(value, fallback = Date.now()) {
  if (!value) return fallback;
  const text = String(value).trim();
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const [hourRaw, minuteRaw] = text.split(":");
    const hour = Number.parseInt(hourRaw, 10);
    const minute = Number.parseInt(minuteRaw, 10);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.getTime();
  }
  const parsed = new Date(text).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getMinutesDiffFromNow(value) {
  if (!value) return null;
  const timestamp = parseEventTimestamp(value, NaN);
  if (!Number.isFinite(timestamp)) return null;
  return Math.round((timestamp - Date.now()) / 60000);
}

function formatRelativeTime(value) {
  const diff = getMinutesDiffFromNow(value);
  if (diff == null) return "--";
  if (Math.abs(diff) < 1) return "Maintenant";
  if (diff > 0 && diff < 60) return `Dans ${diff} min`;
  if (diff > 0) return `Dans ${Math.ceil(diff / 60)} h`;
  const past = Math.abs(diff);
  if (past < 60) return `Il y a ${past} min`;
  return `Il y a ${Math.ceil(past / 60)} h`;
}

function inferCheckinTone(answer) {
  const normalized = String(answer || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) {
    return { label: "Non renseigne", color: T.textLight, bg: "#F8FAFC" };
  }
  if (normalized.includes("bien") || normalized.includes("oui") || normalized.includes("bon")) {
    return { label: "Positif", color: T.success, bg: T.successLight };
  }
  if (normalized.includes("moyen") || normalized.includes("fatigue")) {
    return { label: "A surveiller", color: T.warning, bg: T.warningLight };
  }
  if (normalized.includes("non") || normalized.includes("douleur") || normalized.includes("mal")) {
    return { label: "Attention", color: T.danger, bg: T.dangerLight };
  }
  return { label: "Neutre", color: T.primaryDark, bg: T.teal50 };
}

function ScoreRing({ value }) {
  const safeValue = clampPercent(value);
  const angle = safeValue * 3.6;

  return (
    <div
      style={{
        width: 90,
        height: 90,
        borderRadius: "50%",
        background: `conic-gradient(#FFFFFF ${angle}deg, rgba(255,255,255,0.2) ${angle}deg 360deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: "50%",
          background: "rgba(12,74,68,0.35)",
          border: "1px solid rgba(255,255,255,0.24)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        <strong style={{ fontSize: 21, color: "white", fontWeight: 900 }}>{safeValue}%</strong>
        <span style={{ marginTop: 5, fontSize: 10, color: "rgba(255,255,255,0.9)", fontWeight: 800 }}>Adherence</span>
      </div>
    </div>
  );
}

function QuickAction({ icon: ActionIcon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${T.teal100}`,
        background: "white",
        borderRadius: 14,
        padding: "11px 8px",
        color: T.primaryDark,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: "0 8px 16px rgba(10,124,113,0.06)",
      }}
    >
      <ActionIcon active />
      <span>{label}</span>
    </button>
  );
}

function InsightCard({ title, value, subtitle, tone = "default" }) {
  const tones = {
    default: { bg: "white", border: T.teal100, value: T.navy },
    success: { bg: "#ECFDF5", border: "#A7F3D0", value: T.success },
    warning: { bg: "#FFF7ED", border: "#FDBA74", value: T.warning },
    danger: { bg: "#FEF2F2", border: "#FECACA", value: T.danger },
  };
  const palette = tones[tone] || tones.default;

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        padding: 13,
      }}
    >
      <div style={{ fontSize: 11, color: T.textLight, fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 7, fontSize: 20, fontWeight: 900, color: palette.value, lineHeight: 1.1 }}>{value}</div>
      <div style={{ marginTop: 5, fontSize: 12, color: T.textLight, lineHeight: 1.45 }}>{subtitle}</div>
    </div>
  );
}

function FilterPill({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? T.primary : T.teal100}`,
        background: active ? T.teal50 : "white",
        color: active ? T.primaryDark : T.textLight,
        borderRadius: 999,
        padding: "7px 11px",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function TimelineRow({ icon: RowIcon, color, title, details, stamp, isLast }) {
  return (
    <div style={{ display: "flex", gap: 12, position: "relative", paddingBottom: isLast ? 0 : 15 }}>
      {!isLast && (
        <span
          style={{
            position: "absolute",
            left: 15,
            top: 34,
            bottom: -2,
            width: 2,
            background: `${color}33`,
          }}
        />
      )}

      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 11,
          background: `${color}1A`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <RowIcon active />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 2 }}>
          <strong style={{ fontSize: 14, color: T.navy, fontWeight: 800 }}>{title}</strong>
          <span style={{ fontSize: 11, color: T.textLight, fontWeight: 700, whiteSpace: "nowrap" }}>{stamp}</span>
        </div>
        <p style={{ fontSize: 13, color: T.navyLight, lineHeight: 1.45 }}>{details}</p>
      </div>
    </div>
  );
}

function getPriorityModel({ latestSos, pendingMeds, nextMedication, nextAppointment }) {
  if (latestSos) {
    return {
      level: "critical",
      title: "Urgent: SOS actif",
      subtitle: "Priorite immediate: verifiez les details et contactez votre proche.",
      actionLabel: "Voir le journal",
      actionTarget: "family_assistant",
    };
  }

  const minutesUntilMed = getMinutesDiffFromNow(nextMedication?.scheduledAt);
  if (pendingMeds > 0 && minutesUntilMed != null && minutesUntilMed <= 90) {
    return {
      level: "attention",
      title: "Action rapide medicament",
      subtitle: `Prise a suivre ${formatRelativeTime(nextMedication?.scheduledAt).toLowerCase()}.`,
      actionLabel: "Ouvrir traitements",
      actionTarget: "family_health",
    };
  }

  const minutesUntilAppointment = getMinutesDiffFromNow(nextAppointment?.scheduledAt);
  if (minutesUntilAppointment != null && minutesUntilAppointment > 0 && minutesUntilAppointment <= 24 * 60) {
    return {
      level: "attention",
      title: "Rendez-vous proche",
      subtitle: `Consultation prevue ${formatRelativeTime(nextAppointment?.scheduledAt).toLowerCase()}.`,
      actionLabel: "Voir agenda",
      actionTarget: "family_calendar",
    };
  }

  return {
    level: "stable",
    title: "Situation stable",
    subtitle: "Aucune alerte critique. Continuez le suivi quotidien.",
    actionLabel: "Verifier traitements",
    actionTarget: "family_health",
  };
}

export default function FamilyDashboard({ user, onNavigate = () => {} }) {
  const effectiveUser = useMemo(() => getEffectiveFamilyUser(user), [user]);
  const seniorId = useMemo(() => resolveFamilySeniorId(effectiveUser), [effectiveUser]);

  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timelineFilter, setTimelineFilter] = useState("all");

  const loadHomeData = useCallback(async () => {
    if (!seniorId) {
      setHomeData(null);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getSeniorHome({ seniorId });
      setHomeData(data);
    } catch (apiError) {
      setError(apiError?.message || "Impossible de charger le suivi.");
    } finally {
      setLoading(false);
    }
  }, [seniorId]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const meds = useMemo(() => {
    if (!Array.isArray(homeData?.medications)) return [];
    return homeData.medications;
  }, [homeData?.medications]);

  const totalMeds = meds.length;
  const takenMeds = meds.filter(isMedicationTaken).length;
  const pendingMeds = Math.max(0, totalMeds - takenMeds);
  const adherence = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 0;

  const linkedSeniorName = getFamilyFirstName(homeData?.senior?.name, "votre proche");
  const viewerName = getFamilyFirstName(effectiveUser?.name, "Famille");
  const latestSos = homeData?.latestSosAlert || null;
  const nextMedication = homeData?.nextMedication || null;
  const nextAppointment = homeData?.nextAppointment || null;

  const latestCheckin = Array.isArray(homeData?.dailyQuestions)
    ? homeData.dailyQuestions.find((item) => String(item?.latestAnswer || "").trim())
    : null;
  const checkinTone = inferCheckinTone(latestCheckin?.latestAnswer);

  const priorityModel = getPriorityModel({
    latestSos,
    pendingMeds,
    nextMedication,
    nextAppointment,
  });

  const priorityTone = priorityModel.level === "critical"
    ? { chipBg: T.dangerLight, chipColor: T.danger, border: "#FECACA" }
    : priorityModel.level === "attention"
    ? { chipBg: T.warningLight, chipColor: T.warning, border: "#FDBA74" }
    : { chipBg: T.successLight, chipColor: T.success, border: "#A7F3D0" };

  const activities = useMemo(() => {
    const rows = [];

    if (latestSos) {
      rows.push({
        id: "sos",
        type: "priority",
        icon: Icon.Alert,
        color: T.danger,
        title: "Alerte SOS",
        details: latestSos.comment || "Alerte declenchee par le senior.",
        stamp: formatFamilyDateTime(latestSos.triggeredAt),
        at: parseEventTimestamp(latestSos.triggeredAt),
      });
    }

    meds.forEach((medication, index) => {
      if (!isMedicationTaken(medication)) return;
      rows.push({
        id: `med-${medication?.id ?? index}`,
        type: "medical",
        icon: Icon.Check,
        color: T.success,
        title: "Traitement confirme",
        details: `${medication?.name || "Medicament"}${medication?.dosage ? ` - ${medication.dosage}` : ""}`,
        stamp: formatFamilyTime(medication?.takenAt || medication?.time),
        at: parseEventTimestamp(medication?.takenAt || medication?.time),
      });
    });

    if (latestCheckin?.latestAnswer) {
      rows.push({
        id: "checkin",
        type: "priority",
        icon: Icon.Bot,
        color: checkinTone.color,
        title: "Check-in du matin",
        details: normalizeAnswerLabel(latestCheckin.latestAnswer),
        stamp: formatFamilyTime(latestCheckin?.updatedAt || Date.now()),
        at: parseEventTimestamp(latestCheckin?.updatedAt, Date.now() - 120000),
      });
    }

    if (nextAppointment) {
      rows.push({
        id: "appointment",
        type: "medical",
        icon: Icon.Calendar,
        color: T.primary,
        title: "Rendez-vous medical",
        details: nextAppointment?.doctorName || nextAppointment?.specialty || "Rendez-vous programme",
        stamp: formatFamilyDateTime(nextAppointment?.scheduledAt),
        at: parseEventTimestamp(nextAppointment?.scheduledAt, Date.now()),
      });
    }

    return sortByDateDesc(rows, (row) => row.at).slice(0, 8);
  }, [latestSos, meds, latestCheckin, checkinTone.color, nextAppointment]);

  const filteredActivities = useMemo(() => {
    if (timelineFilter === "priority") {
      return activities.filter((item) => item.type === "priority");
    }
    if (timelineFilter === "medical") {
      return activities.filter((item) => item.type === "medical");
    }
    return activities;
  }, [activities, timelineFilter]);

  return (
    <Phone>
      <div style={{ fontFamily: PAGE_BODY_FONT }}>
        <div style={{ minHeight: "100vh", padding: "16px 16px 110px", color: T.navy }}>
          <div style={{ animation: "fadeUp .45s both", marginBottom: 14 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 11px",
                borderRadius: 999,
                background: T.teal50,
                color: T.primaryDark,
                border: `1px solid ${T.teal100}`,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              <Icon.Users />
              Espace Famille
            </div>

            <h1 style={{ fontFamily: PAGE_TITLE_FONT, fontSize: 30, fontWeight: 400, lineHeight: 1.06, marginBottom: 8 }}>
              Bonjour, {viewerName}
            </h1>
            <p style={{ color: T.textLight, fontSize: 14, lineHeight: 1.6 }}>
              Tableau de pilotage de {linkedSeniorName}: priorites, actions et evolution du jour.
            </p>
          </div>

          {!seniorId && (
            <div
              style={{
                animation: "fadeUp .45s .05s both",
                background: "white",
                borderRadius: 20,
                border: `1.5px solid ${T.teal100}`,
                padding: 18,
                boxShadow: "0 10px 22px rgba(10,124,113,0.08)",
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Aucun proche relie</h2>
              <p style={{ fontSize: 14, color: T.textLight, lineHeight: 1.55, marginBottom: 12 }}>
                Associez un senior dans Reglages pour activer un accueil intelligent.
              </p>
              <button
                onClick={() => onNavigate("family_settings")}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
                  color: "white",
                  padding: "10px 14px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Ouvrir les Reglages
              </button>
            </div>
          )}

          {!!seniorId && (
            <>
              <div
                style={{
                  animation: "fadeUp .45s .05s both",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 24,
                  padding: 18,
                  marginBottom: 14,
                  background: "linear-gradient(135deg, #0D9488 0%, #0A7C71 60%, #115E59 100%)",
                  color: "white",
                  boxShadow: "0 18px 36px rgba(13,148,136,0.25)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 150,
                    height: 150,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.12)",
                    right: -40,
                    top: -55,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    left: -30,
                    bottom: -48,
                  }}
                />

                <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: 999, background: priorityTone.chipBg, color: priorityTone.chipColor, fontSize: 11, fontWeight: 800, marginBottom: 9 }}>
                      {priorityModel.level === "critical" ? "Niveau Critique" : priorityModel.level === "attention" ? "Niveau Attention" : "Niveau Stable"}
                    </div>
                    <h2 style={{ fontSize: 24, lineHeight: 1.1, marginBottom: 7 }}>{priorityModel.title}</h2>
                    <p style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.92 }}>{priorityModel.subtitle}</p>
                    <button
                      onClick={() => onNavigate(priorityModel.actionTarget)}
                      style={{
                        marginTop: 12,
                        border: `1px solid ${priorityTone.border}`,
                        borderRadius: 11,
                        background: "rgba(255,255,255,0.14)",
                        color: "white",
                        fontSize: 12,
                        fontWeight: 800,
                        padding: "7px 11px",
                        cursor: "pointer",
                      }}
                    >
                      {priorityModel.actionLabel}
                    </button>
                  </div>

                  <ScoreRing value={adherence} />
                </div>

                <div style={{ position: "relative", zIndex: 1, marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                  <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 9px" }}>
                    <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 700 }}>Prochaine prise</div>
                    <div style={{ marginTop: 2, fontSize: 13, fontWeight: 800 }}>
                      {nextMedication?.name || "Aucune"}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, opacity: 0.84 }}>
                      {nextMedication?.scheduledAt ? formatRelativeTime(nextMedication.scheduledAt) : "--"}
                    </div>
                  </div>

                  <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 9px" }}>
                    <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 700 }}>Prochain RDV</div>
                    <div style={{ marginTop: 2, fontSize: 13, fontWeight: 800 }}>
                      {nextAppointment?.doctorName || nextAppointment?.specialty || "Non planifie"}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, opacity: 0.84 }}>
                      {nextAppointment?.scheduledAt ? formatFamilyDate(nextAppointment.scheduledAt) : "--"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ animation: "fadeUp .45s .08s both", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}>
                <QuickAction icon={Icon.Pill} label="Traitements" onClick={() => onNavigate("family_health")} />
                <QuickAction icon={Icon.Calendar} label="Agenda" onClick={() => onNavigate("family_calendar")} />
                <QuickAction icon={Icon.Bot} label="Assistant" onClick={() => onNavigate("family_assistant")} />
                <QuickAction icon={Icon.Settings} label="Reglages" onClick={() => onNavigate("family_settings")} />
              </div>

              <div style={{ animation: "fadeUp .45s .1s both", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <InsightCard
                  title="Traitements"
                  value={`${takenMeds}/${totalMeds}`}
                  subtitle={pendingMeds > 0 ? `${pendingMeds} prise(s) a valider` : "tout est confirme"}
                  tone={pendingMeds > 0 ? "warning" : "success"}
                />
                <InsightCard
                  title="Check-in"
                  value={checkinTone.label}
                  subtitle={normalizeAnswerLabel(latestCheckin?.latestAnswer)}
                  tone={checkinTone.label === "Attention" ? "danger" : "default"}
                />
                <InsightCard
                  title="Risque"
                  value={latestSos ? "Eleve" : pendingMeds > 0 ? "Modere" : "Faible"}
                  subtitle={latestSos ? "alerte SOS active" : "base sur les evenements recents"}
                  tone={latestSos ? "danger" : pendingMeds > 0 ? "warning" : "success"}
                />
                <InsightCard
                  title="Actualisation"
                  value={loading ? "En cours..." : "A jour"}
                  subtitle={loading ? "synchronisation des donnees" : "mise a jour reussie"}
                />
              </div>

              <div
                style={{
                  animation: "fadeUp .45s .14s both",
                  background: "white",
                  borderRadius: 20,
                  border: `1.5px solid ${T.teal100}`,
                  boxShadow: "0 10px 22px rgba(10,124,113,0.08)",
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 900 }}>Chronologie intelligente</h3>
                  <button
                    onClick={loadHomeData}
                    disabled={loading}
                    style={{
                      border: `1px solid ${T.teal100}`,
                      background: "white",
                      borderRadius: 10,
                      color: T.primaryDark,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "5px 10px",
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Sync..." : "Actualiser"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
                  {TIMELINE_FILTERS.map((filter) => (
                    <FilterPill
                      key={filter.id}
                      label={filter.label}
                      active={timelineFilter === filter.id}
                      onClick={() => setTimelineFilter(filter.id)}
                    />
                  ))}
                </div>

                {!!error && (
                  <div
                    style={{
                      marginBottom: 10,
                      borderRadius: 12,
                      background: T.dangerLight,
                      border: "1px solid #FECACA",
                      color: T.danger,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "9px 10px",
                    }}
                  >
                    {error}
                  </div>
                )}

                {!loading && !error && !filteredActivities.length && (
                  <p style={{ color: T.textLight, fontSize: 13 }}>Aucun evenement pour ce filtre.</p>
                )}

                {filteredActivities.map((activity, index) => (
                  <TimelineRow
                    key={activity.id}
                    icon={activity.icon}
                    color={activity.color}
                    title={activity.title}
                    details={activity.details}
                    stamp={activity.stamp}
                    isLast={index === filteredActivities.length - 1}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <FamilyBottomNav activeTab="family_dashboard" onNavigate={onNavigate} />
      </div>
    </Phone>
  );
}
