import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { getSeniorHome } from "../../services/homeApi";
import {
  formatFamilyDate,
  formatFamilyDateTime,
  getEffectiveFamilyUser,
  getMedicationStatusMeta,
  resolveFamilySeniorId,
} from "./familyUtils";

const PAGE_BODY_FONT = "'DM Sans', sans-serif";
const PAGE_TITLE_FONT = "'DM Serif Display', serif";

function timeToSortValue(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

function ScheduleRow({ medication }) {
  const status = getMedicationStatusMeta(medication?.status);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid #EAF5F2",
      }}
    >
      <strong style={{ fontSize: 13, color: T.primaryDark }}>{medication?.time || "--:--"}</strong>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: T.navy, fontWeight: 800 }}>{medication?.name || "Medicament"}</div>
        <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{medication?.dosage || "Dosage non precise"}</div>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          borderRadius: 999,
          padding: "5px 8px",
          background: status.bg,
          color: status.color,
          whiteSpace: "nowrap",
        }}
      >
        {status.label}
      </span>
    </div>
  );
}

export default function FamilyCalendar({ user, onNavigate = () => {} }) {
  const effectiveUser = useMemo(() => getEffectiveFamilyUser(user), [user]);
  const seniorId = useMemo(() => resolveFamilySeniorId(effectiveUser), [effectiveUser]);

  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCalendarData = useCallback(async () => {
    if (!seniorId) {
      setHomeData(null);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getSeniorHome({ seniorId });
      setHomeData(data);
    } catch (apiError) {
      setHomeData(null);
      setError(apiError?.message || "Impossible de charger l'agenda.");
    } finally {
      setLoading(false);
    }
  }, [seniorId]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const medications = Array.isArray(homeData?.medications)
    ? [...homeData.medications].sort((left, right) => timeToSortValue(left?.time) - timeToSortValue(right?.time))
    : [];
  const nextAppointment = homeData?.nextAppointment || null;

  return (
    <Phone>
      <div style={{ fontFamily: PAGE_BODY_FONT }}>
        <div style={{ minHeight: "100vh", padding: "16px 16px 110px", color: T.navy }}>
          <div style={{ animation: "fadeUp .45s both", marginBottom: 14 }}>
            <h1 style={{ fontFamily: PAGE_TITLE_FONT, fontSize: 28, fontWeight: 400, lineHeight: 1.1, marginBottom: 8 }}>
              Agenda
            </h1>
            <p style={{ color: T.textLight, fontSize: 14, lineHeight: 1.6 }}>
              Planning medical du proche et chronologie des prises du jour.
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
              <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>Agenda indisponible</h2>
              <p style={{ fontSize: 14, color: T.textLight, lineHeight: 1.55, marginBottom: 12 }}>
                Associez un senior depuis Reglages pour afficher les rendez-vous.
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
                Aller aux Reglages
              </button>
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
                <div style={{ fontSize: 12, opacity: 0.84, fontWeight: 800, marginBottom: 7 }}>Prochain rendez-vous</div>
                <h2 style={{ fontSize: 22, lineHeight: 1.1, marginBottom: 6 }}>
                  {nextAppointment?.doctorName || nextAppointment?.specialty || "Aucun rendez-vous"}
                </h2>
                <p style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>
                  {nextAppointment?.scheduledAt ? formatFamilyDateTime(nextAppointment.scheduledAt) : "Aucune date planifiee"}
                </p>
              </div>

              <div
                style={{
                  animation: "fadeUp .45s .08s both",
                  background: "white",
                  borderRadius: 20,
                  border: `1.5px solid ${T.teal100}`,
                  boxShadow: "0 10px 22px rgba(10,124,113,0.08)",
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 900 }}>Traitements du jour</h3>
                  <span style={{ fontSize: 12, color: T.textLight, fontWeight: 700 }}>{formatFamilyDate(Date.now())}</span>
                </div>

                {loading && <p style={{ fontSize: 13, color: T.textLight }}>Chargement du planning...</p>}
                {!loading && !!error && <p style={{ fontSize: 13, color: T.danger, fontWeight: 700 }}>{error}</p>}
                {!loading && !error && !medications.length && (
                  <p style={{ fontSize: 13, color: T.textLight }}>Aucune prise planifiee aujourd'hui.</p>
                )}
                {!loading && !error && !!medications.length && (
                  <div>
                    {medications.map((medication, index) => (
                      <div key={medication?.id ?? index} style={{ borderBottom: index === medications.length - 1 ? "none" : undefined }}>
                        <ScheduleRow medication={medication} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={loadCalendarData}
                  disabled={loading}
                  style={{
                    border: `1px solid ${T.teal100}`,
                    background: "white",
                    borderRadius: 10,
                    color: T.primaryDark,
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "6px 10px",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Sync..." : "Actualiser l'agenda"}
                </button>
              </div>
            </>
          )}
        </div>

        <FamilyBottomNav activeTab="family_calendar" onNavigate={onNavigate} />
      </div>
    </Phone>
  );
}
