import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { getSeniorAssistantHistory } from "../../services/homeApi";
import {
  formatFamilyDateTime,
  getEffectiveFamilyUser,
  getFamilyFirstName,
  resolveFamilySeniorId,
} from "./familyUtils";

const PAGE_BODY_FONT = "'DM Sans', sans-serif";
const PAGE_TITLE_FONT = "'DM Serif Display', serif";
const ALERT_KEYWORDS = ["mal", "douleur", "fatigue", "vertige", "chute", "sos", "angoisse", "urgent"];

function normalizeSender(value) {
  const sender = String(value || "").trim().toLowerCase();
  if (sender === "senior" || sender === "user") return "senior";
  return "assistant";
}

function toMessageList(rawMessages = []) {
  if (!Array.isArray(rawMessages)) return [];
  return rawMessages
    .filter((row) => row && typeof row === "object")
    .map((row, index) => ({
      id: row?.id ?? `msg-${index}`,
      sender: normalizeSender(row?.sender),
      text: String(row?.message || "").trim(),
      createdAt: row?.createdAt || null,
    }))
    .filter((row) => Boolean(row.text));
}

function getSignalLevel(text) {
  const normalized = String(text || "").toLowerCase();
  return ALERT_KEYWORDS.some((keyword) => normalized.includes(keyword)) ? "attention" : "normal";
}

function JournalCard({ row }) {
  const isSenior = row.sender === "senior";
  const signal = getSignalLevel(row.text);
  const borderColor = signal === "attention" ? "#FECACA" : T.teal100;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        border: `1.5px solid ${borderColor}`,
        padding: 14,
        boxShadow: "0 8px 18px rgba(10,124,113,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: isSenior ? T.primary : "#64748B",
            }}
          />
          <strong style={{ fontSize: 13, color: T.navy }}>{isSenior ? "Senior" : "Assistant IA"}</strong>
        </div>
        <span style={{ fontSize: 11, color: T.textLight, fontWeight: 700 }}>{formatFamilyDateTime(row.createdAt)}</span>
      </div>

      <p style={{ fontSize: 14, color: T.navyLight, lineHeight: 1.55 }}>{row.text}</p>

      {signal === "attention" && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginTop: 10,
            padding: "5px 8px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 800,
            background: "#FEF2F2",
            color: T.danger,
          }}
        >
          Signal a surveiller
        </span>
      )}
    </div>
  );
}

export default function FamilyAssistant({ user, onNavigate = () => {} }) {
  const effectiveUser = useMemo(() => getEffectiveFamilyUser(user), [user]);
  const seniorId = useMemo(() => resolveFamilySeniorId(effectiveUser), [effectiveUser]);
  const familyName = getFamilyFirstName(effectiveUser?.name, "Famille");

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    if (!seniorId) {
      setMessages([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getSeniorAssistantHistory({ seniorId });
      const conversation = data?.conversation || {};
      const rows = toMessageList(conversation?.messages);
      setMessages(rows.reverse());
    } catch (apiError) {
      setMessages([]);
      setError(apiError?.message || "Impossible de charger le journal assistant.");
    } finally {
      setLoading(false);
    }
  }, [seniorId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const seniorMessages = messages.filter((row) => row.sender === "senior");
  const attentionCount = seniorMessages.filter((row) => getSignalLevel(row.text) === "attention").length;

  return (
    <Phone>
      <div style={{ fontFamily: PAGE_BODY_FONT }}>
        <div style={{ minHeight: "100vh", padding: "16px 16px 110px", color: T.navy }}>
          <div style={{ animation: "fadeUp .45s both", marginBottom: 14 }}>
            <h1 style={{ fontFamily: PAGE_TITLE_FONT, fontSize: 28, fontWeight: 400, lineHeight: 1.1, marginBottom: 8 }}>
              Journal IA
            </h1>
            <p style={{ color: T.textLight, fontSize: 14, lineHeight: 1.6 }}>
              Lecture simple des echanges senior-assistant pour {familyName}.
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
              <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>Journal indisponible</h2>
              <p style={{ fontSize: 14, color: T.textLight, lineHeight: 1.55 }}>
                Associez un proche dans Reglages pour suivre les conversations utiles.
              </p>
            </div>
          )}

          {!!seniorId && (
            <>
              <div
                style={{
                  animation: "fadeUp .45s .05s both",
                  background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
                  color: "white",
                  borderRadius: 22,
                  padding: 16,
                  marginBottom: 12,
                  boxShadow: "0 16px 34px rgba(13,148,136,0.24)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.84, fontWeight: 800, marginBottom: 7 }}>Resume du journal</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 900 }}>{messages.length}</div>
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>messages recents</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 900 }}>{attentionCount}</div>
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>signaux a surveiller</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: T.navy }}>Conversations recentes</h3>
                <button
                  onClick={loadHistory}
                  disabled={loading}
                  style={{
                    border: `1px solid ${T.teal100}`,
                    background: "white",
                    borderRadius: 10,
                    color: T.primaryDark,
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "4px 10px",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Sync..." : "Actualiser"}
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {loading && <p style={{ fontSize: 13, color: T.textLight }}>Chargement du journal...</p>}
                {!loading && !!error && <p style={{ fontSize: 13, color: T.danger, fontWeight: 700 }}>{error}</p>}
                {!loading && !error && !messages.length && (
                  <p style={{ fontSize: 13, color: T.textLight }}>Aucun message disponible pour le moment.</p>
                )}
                {!loading && !error && messages.slice(0, 18).map((row, index) => (
                  <div key={row.id} style={{ animation: `fadeUp .35s ${index * 0.03}s both` }}>
                    <JournalCard row={row} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <FamilyBottomNav activeTab="family_assistant" onNavigate={onNavigate} />
      </div>
    </Phone>
  );
}
