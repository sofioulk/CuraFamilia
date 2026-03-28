import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { BottomNav } from "../../components/senior/BottomNav";
import { getSeniorMedications, parseSeniorIdFromUser } from "../../services/homeApi";

const PAGE_BODY_FONT = "'DM Sans', sans-serif";
const PAGE_TITLE_FONT = "'DM Serif Display', serif";

function normalizeDosage(value) {
  if (!value) return "";
  return String(value)
    .replace(/\bcomprime\b/gi, "comprim\u00E9")
    .replace(/\bcomprimes\b/gi, "comprim\u00E9s");
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1.5px solid ${active ? T.primary : T.teal100}`,
        background: active ? T.teal50 : "white",
        color: active ? T.primaryDark : T.textLight,
        padding: "10px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function MedicationCard({ med }) {
  const instruction = String(med?.instruction ?? "").trim();
  const hasInstruction = Boolean(instruction);
  const dosageLabel = normalizeDosage(med?.dosage);

  return (
    <div
      style={{
        background: "white",
        borderRadius: 22,
        padding: 16,
        border: `1.5px solid ${T.teal100}`,
        boxShadow: "0 8px 20px rgba(10,124,113,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: T.teal50,
            color: T.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon.Pill active />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: T.navy }}>
            {med.name}
          </div>
          <div style={{ fontSize: 14, color: T.navyLight, marginTop: 4 }}>
            {dosageLabel}
          </div>
        </div>

        <div
          style={{
            padding: "7px 10px",
            borderRadius: 999,
            background: T.teal50,
            color: T.primaryDark,
            fontSize: 12,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {med.period}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div
          style={{
            background: T.teal50,
            borderRadius: 16,
            padding: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: T.textLight,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            <Icon.Clock />
            Heure
          </div>
          <div style={{ fontSize: 15, color: T.navy, fontWeight: 900 }}>
            {med.time}
          </div>
        </div>

        <div
          style={{
            background: T.teal50,
            borderRadius: 16,
            padding: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: T.textLight,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            <Icon.Calendar />
            {"Fr\u00E9quence"}
          </div>
          <div style={{ fontSize: 15, color: T.navy, fontWeight: 900 }}>
            {med.frequency}
          </div>
        </div>
      </div>

      {hasInstruction && (
        <div
          style={{
            marginTop: 12,
            background: "#f8fffd",
            borderRadius: 16,
            padding: 12,
            border: `1px solid ${T.teal100}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: T.textLight,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            <Icon.Info />
            Instruction
          </div>
          <div style={{ fontSize: 14, color: T.navy, lineHeight: 1.5 }}>
            {instruction}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ElderMedications({ onNavigate = () => {}, user = null }) {
  const [filter, setFilter] = useState("all");
  const [medications, setMedications] = useState([]);
  const [count, setCount] = useState(0);
  const [takenCount, setTakenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const effectiveUser = useMemo(() => {
    if (user) {
      return user;
    }
    try {
      const raw = localStorage.getItem("cura_auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }, [user]);

  const seniorId = useMemo(() => parseSeniorIdFromUser(effectiveUser), [effectiveUser]);

  const loadMedications = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!seniorId) {
      if (requestId === requestIdRef.current) {
        setMedications([]);
        setCount(0);
        setTakenCount(0);
        setError("Session senior introuvable. Veuillez vous reconnecter.");
      }
      return;
    }

    if (requestId === requestIdRef.current) {
      setLoading(true);
      setError("");
    }

    try {
      const data = await getSeniorMedications({ seniorId, period: filter });
      const apiMedications = Array.isArray(data?.medications) ? data.medications : [];
      const computedTakenCount = apiMedications.filter((medication) => {
        const status = String(medication?.status || "").trim().toLowerCase();
        return status === "taken" || Boolean(medication?.takenAt);
      }).length;
      const normalizedMedications = apiMedications.map((medication) => ({
        id: medication?.id,
        name: medication?.name || "",
        dosage: medication?.dosage || "",
        period: medication?.period || "",
        time: medication?.time || "",
        frequency: medication?.frequency || "",
        instruction: medication?.instruction || "",
        active: Boolean(medication?.active),
        status: medication?.status || "",
        takenAt: medication?.takenAt || null,
      }));

      if (requestId === requestIdRef.current) {
        setMedications(normalizedMedications);
        const numericCount = Number.parseInt(data?.count, 10);
        setCount(Number.isFinite(numericCount) ? numericCount : 0);
        const numericTakenCount = Number.parseInt(data?.takenCount, 10);
        setTakenCount(Number.isFinite(numericTakenCount) ? numericTakenCount : computedTakenCount);
      }
    } catch (apiError) {
      if (requestId === requestIdRef.current) {
        setMedications([]);
        setCount(0);
        setTakenCount(0);
        setError(apiError?.message || "Impossible de charger les médicaments.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filter, seniorId]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const summaryTotal = Number.isFinite(count) ? count : medications.length;
  const pageSubtitle = `Aujourd'hui : ${takenCount} prise(s) effectu\u00E9e(s) sur ${summaryTotal}.`;

  return (
    <Phone>
      <div style={{ fontFamily: PAGE_BODY_FONT }}>
      <div style={{ padding: "8px 18px 110px", color: T.navy }}>
        {/* Header */}
        <div style={{ animation: "fadeUp .45s both", marginBottom: 18 }}>
          <button
            onClick={() => onNavigate("dashboard")}
            style={{
              border: "none",
              background: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: T.textLight,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            <Icon.ArrowLeft />
            Retour
          </button>

          <h1
            style={{
              fontFamily: PAGE_TITLE_FONT,
              fontSize: 28,
              lineHeight: 1.15,
              fontWeight: 400,
              letterSpacing: -0.5,
              marginBottom: 6,
            }}
          >
            {"Mes m\u00E9dicaments"}
          </h1>

          <p style={{ color: T.textLight, fontSize: 14, lineHeight: 1.6 }}>
            {pageSubtitle}
          </p>
        </div>

        {/* Summary card */}
        <div
          style={{
            animation: "fadeUp .45s .05s both",
            background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
            color: "white",
            borderRadius: 24,
            padding: 18,
            boxShadow: "0 16px 34px rgba(13,148,136,0.24)",
            marginBottom: 16,
          }}
        >
          <div style={{ fontFamily: PAGE_BODY_FONT, fontSize: 13, opacity: 0.82, fontWeight: 700, marginBottom: 8 }}>
            Traitement actif
          </div>
          <div style={{ fontFamily: PAGE_BODY_FONT, fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
            {loading ? "..." : count}{" m\u00E9dicaments"}
          </div>
          <div style={{ fontSize: 14, opacity: 0.92, marginTop: 6 }}>
            Rappels actifs chaque jour.
          </div>
        </div>

        {/* Filters */}
        <div style={{ animation: "fadeUp .45s .1s both", marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            <FilterChip label="Tous" active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterChip label="Matin" active={filter === "matin"} onClick={() => setFilter("matin")} />
            <FilterChip label="Midi" active={filter === "midi"} onClick={() => setFilter("midi")} />
            <FilterChip label="Soir" active={filter === "soir"} onClick={() => setFilter("soir")} />
            <FilterChip label="Ponctuel" active={filter === "ponctuel"} onClick={() => setFilter("ponctuel")} />
          </div>
        </div>

        {/* Medications list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading && (
            <p style={{ fontSize: 12, color: T.textLight }}>
              Chargement du traitement...
            </p>
          )}
          {!loading && error && (
            <p style={{ fontSize: 12, color: T.danger, fontWeight: 700 }}>
              {error}
            </p>
          )}
          {!loading && !error && !medications.length && (
            <p style={{ fontSize: 12, color: T.textLight }}>
              {"Aucun m\u00E9dicament actif pour cette p\u00E9riode."}
            </p>
          )}
          {!loading && !error && medications.map((med, index) => (
            <div key={med.id ?? index} style={{ animation: `fadeUp .45s ${0.12 + index * 0.05}s both` }}>
              <MedicationCard med={med} />
            </div>
          ))}
        </div>
      </div>

      <BottomNav current="medications" onNavigate={onNavigate} />
      </div>
    </Phone>
  );
}
