import { useCallback, useEffect, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { getCheckinTrend, getSeniorAssistantHistory } from "../../services/homeApi";
import {
  formatFamilyTime,
  useFamilySeniorId,
} from "./familyUtils";

const BODY = "'DM Sans', sans-serif";
const SERIF = "'DM Serif Display', serif";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function toDateStr(d) {
  return d.toISOString().split("T")[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function formatNavDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function normalizeSender(value) {
  const s = String(value || "").trim().toLowerCase();
  return s === "senior" || s === "user" ? "senior" : "assistant";
}

function toMessageList(rawMessages = []) {
  if (!Array.isArray(rawMessages)) return [];
  return rawMessages
    .filter(row => row && typeof row === "object")
    .map((row, index) => ({
      id: row?.id ?? `msg-${index}`,
      sender: normalizeSender(row?.sender),
      text: String(row?.message || row?.text || "").trim(),
      createdAt: row?.createdAt || null,
    }))
    .filter(row => Boolean(row.text));
}

function moodFromCheckin(entry) {
  if (!entry) return null;
  const label = entry.moodLabel || entry.label || null;
  if (!label) return null;
  const l = label.toLowerCase();
  const emoji = l.includes("bien") || l.includes("bon") ? "😊"
    : l.includes("moyen") ? "😐"
    : l.includes("difficile") ? "😔" : "😶";
  const color = l.includes("bien") || l.includes("bon") ? T.success
    : l.includes("moyen") ? T.warning
    : l.includes("difficile") ? T.danger : T.textLight;
  return { label, emoji, color };
}

/* ─────────────────────────────────────────────────────────────
   Skeleton & ErrorRetry
───────────────────────────────────────────────────────────── */

const SHIMMER = {
  background: "linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.2s infinite",
};

function Bone({ w = "100%", h, r = 8, style }) {
  return <div style={{ width: w, height: h, borderRadius: r, ...SHIMMER, ...style }} />;
}

function AssistantSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
      <Bone h={40} r={16} w="65%" style={{ alignSelf: "flex-end" }} />
      <Bone h={56} r={16} w="75%" />
      <Bone h={40} r={16} w="60%" style={{ alignSelf: "flex-end" }} />
      <Bone h={72} r={16} w="80%" />
    </div>
  );
}

function ErrorRetry({ message, onRetry }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, margin: "0 auto 14px",
        background: "#FEF2F2", display: "grid", placeItems: "center", fontSize: 24,
      }}>⚠️</div>
      <p style={{ fontSize: 15, color: T.navy, fontWeight: 800, marginBottom: 6 }}>Erreur de chargement</p>
      <p style={{ fontSize: 13, color: T.textLight, lineHeight: 1.55, marginBottom: 18 }}>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          border: "none", borderRadius: 12, background: T.primary,
          color: "white", padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}
      >Réessayer</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Date Navigator
───────────────────────────────────────────────────────────── */

function DateNavigator({ date, onPrev, onNext }) {
  const today = toDateStr(new Date());
  const isToday = date === today;
  const label = isToday ? "Aujourd'hui" : formatNavDate(date);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "white", borderRadius: 14,
      boxShadow: "0 2px 10px rgba(13,148,136,0.06)",
      padding: "10px 12px", marginBottom: 12,
    }}>
      <button
        type="button"
        aria-label="Jour précédent"
        onClick={onPrev}
        style={{
          width: 36, height: 36, borderRadius: 10,
          border: "1px solid #E2E8F0", background: "white",
          cursor: "pointer", display: "grid", placeItems: "center",
          fontSize: 16, color: T.navy,
        }}
      >←</button>
      <span style={{ fontSize: 14, fontWeight: 800, color: T.navy, textTransform: "capitalize" }}>
        {label}
      </span>
      <button
        type="button"
        aria-label="Jour suivant"
        onClick={onNext}
        disabled={isToday}
        style={{
          width: 36, height: 36, borderRadius: 10,
          border: "1px solid #E2E8F0", background: "white",
          cursor: isToday ? "not-allowed" : "pointer",
          display: "grid", placeItems: "center",
          fontSize: 16, color: isToday ? "#CBD5E1" : T.navy,
          opacity: isToday ? 0.4 : 1,
        }}
      >→</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Mood Insight Banner
───────────────────────────────────────────────────────────── */

function MoodBanner({ mood }) {
  if (!mood) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "white", borderRadius: 12,
      boxShadow: "0 2px 8px rgba(13,148,136,0.06)",
      padding: "10px 14px", marginBottom: 12,
      borderLeft: `4px solid ${mood.color}`,
    }}>
      <span style={{ fontSize: 20 }}>{mood.emoji}</span>
      <div>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.textLight }}>Humeur du jour · </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: mood.color }}>{mood.label}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Chat Bubble
───────────────────────────────────────────────────────────── */

function Bubble({ msg }) {
  const isSenior = msg.sender === "senior";
  return (
    <div style={{
      display: "flex",
      flexDirection: isSenior ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 8,
      marginBottom: 10,
    }}>
      {/* Avatar for assistant */}
      {!isSenior && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg,${T.primary},${T.primaryDark})`,
          display: "grid", placeItems: "center",
          fontSize: 10, fontWeight: 800, color: "white",
        }}>IA</div>
      )}

      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isSenior ? "flex-end" : "flex-start" }}>
        <div style={{
          padding: "10px 14px", borderRadius: isSenior ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isSenior ? T.primary : "#F1F5F9",
          color: isSenior ? "white" : T.navy,
          fontSize: 14, lineHeight: 1.5,
          boxShadow: isSenior ? "0 2px 8px rgba(13,148,136,0.2)" : "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          {msg.text}
        </div>
        <span style={{ fontSize: 10, color: T.textLight, fontWeight: 600, marginTop: 3 }}>
          {formatFamilyTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main — FamilyAssistant
───────────────────────────────────────────────────────────── */

export default function FamilyAssistant({ user, onNavigate = () => {} }) {
  const { seniorId, isResolvingSenior } = useFamilySeniorId(user);

  const today = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [messages, setMessages] = useState([]);
  const [moodData, setMoodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!seniorId) {
      if (isResolvingSenior) {
        setLoading(true);
        setError(null);
        return;
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [histRes, moodRes] = await Promise.allSettled([
        getSeniorAssistantHistory({ seniorId, date: selectedDate }),
        getCheckinTrend({ seniorId, days: 1 }),
      ]);

      if (histRes.status === "fulfilled") {
        const data = histRes.value;
        const conv = data?.conversation || data;
        const raw = conv?.messages || (Array.isArray(data) ? data : []);
        setMessages(toMessageList(raw));
      } else {
        setError(histRes.reason?.message || "Impossible de charger le journal.");
      }

      if (moodRes.status === "fulfilled") {
        const days = Array.isArray(moodRes.value?.days) ? moodRes.value.days : [];
        const today_entry = days.find(d => d.date === selectedDate) || days[0] || null;
        setMoodData(moodFromCheckin(today_entry));
      }
    } finally {
      setLoading(false);
    }
  }, [isResolvingSenior, selectedDate, seniorId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handlePrev = () => setSelectedDate(d => addDays(d, -1));
  const handleNext = () => {
    const next = addDays(selectedDate, 1);
    if (next <= today) setSelectedDate(next);
  };

  return (
    <Phone>
      <div style={{ fontFamily: BODY }}>
        <div style={{ minHeight: "100vh", background: "#F8F6FF", padding: "16px 16px 110px", color: T.navy }}>
          {/* Header */}
          <div style={{ marginBottom: 14 }}>
            <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, lineHeight: 1.1, marginBottom: 4 }}>
              Journal IA
            </h1>
            <p style={{ fontSize: 13, color: T.textLight }}>
              Conversations entre le senior et l'assistant
            </p>
          </div>

          {!seniorId && !isResolvingSenior ? (
            <div style={{
              background: "white", borderRadius: 20, padding: 18,
              boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>Journal indisponible</h2>
              <p style={{ fontSize: 14, color: T.textLight, lineHeight: 1.55 }}>
                Associez un proche dans Réglages pour suivre les conversations.
              </p>
            </div>
          ) : (
            <>
              <DateNavigator
                date={selectedDate}
                onPrev={handlePrev}
                onNext={handleNext}
              />

              {moodData && <MoodBanner mood={moodData} />}

              {(isResolvingSenior || loading) ? (
                <AssistantSkeleton />
              ) : error ? (
                <ErrorRetry message={error} onRetry={loadHistory} />
              ) : messages.length === 0 ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", padding: "48px 20px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                  <p style={{ fontSize: 14, color: T.textLight, fontWeight: 700 }}>
                    Aucune conversation ce jour.
                  </p>
                </div>
              ) : (
                <div>
                  {messages.map(msg => (
                    <Bubble key={msg.id} msg={msg} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <FamilyBottomNav activeTab="family_assistant" onNavigate={onNavigate} />
      </div>
    </Phone>
  );
}
