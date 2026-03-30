import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { getSeniorMedications } from "../../services/homeApi";
import {
  getEffectiveFamilyUser,
  getMedicationStatusMeta,
  isMedicationTaken,
  resolveFamilySeniorId,
} from "./familyUtils";

const PAGE_BODY_FONT = "'DM Sans', sans-serif";
const PAGE_TITLE_FONT = "'DM Serif Display', serif";

function FilterChip({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1.5px solid ${active ? T.primary : T.teal100}`,
        background: active ? T.teal50 : "white",
        color: active ? T.primaryDark : T.textLight,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        padding: "9px 12px",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function MedicationCard({ medication }) {
  const status = getMedicationStatusMeta(medication?.status);
  return (
    <div
      style={{
        background: "white",
        border: `1.5px solid ${T.teal100}`,
        borderRadius: 18,
        padding: 14,
        boxShadow: "0 8px 18px rgba(10,124,113,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, color: T.navy, fontWeight: 900 }}>{medication?.name || "Medicament"}</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>
              {medication?.dosage || "Dosage non precise"}
            </div>
          </div>
        </div>

        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 800,
            background: status.bg,
            color: status.color,
            whiteSpace: "nowrap",
          }}
        >
          {status.label}
        </span>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <div style={{ background: T.teal50, borderRadius: 12, padding: "9px 10px" }}>
          <div style={{ fontSize: 11, color: T.textLight, fontWeight: 700 }}>Periode</div>
          <div style={{ fontSize: 13, color: T.navy, fontWeight: 800, marginTop: 3 }}>
            {medication?.period || "--"}
          </div>
        </div>
        <div style={{ background: T.teal50, borderRadius: 12, padding: "9px 10px" }}>
          <div style={{ fontSize: 11, color: T.textLight, fontWeight: 700 }}>Heure</div>
          <div style={{ fontSize: 13, color: T.navy, fontWeight: 800, marginTop: 3 }}>
            {medication?.time || "--:--"}
          </div>
        </div>
      </div>

      {!!medication?.instruction && (
        <div
          style={{
            marginTop: 10,
            background: "#F8FFFD",
            border: `1px solid ${T.teal100}`,
            borderRadius: 12,
            padding: "8px 10px",
            fontSize: 12,
            color: T.navyLight,
            lineHeight: 1.45,
          }}
        >
          {medication.instruction}
        </div>
      )}
    </div>
  );
}

export default function FamilyHealth({ user, onNavigate = () => {} }) {
  const effectiveUser = useMemo(() => getEffectiveFamilyUser(user), [user]);
  const seniorId = useMemo(() => resolveFamilySeniorId(effectiveUser), [effectiveUser]);

  const [filter, setFilter] = useState("all");
  const [medications, setMedications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [takenCount, setTakenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const loadMedications = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!seniorId) {
      setLoading(false);
      setMedications([]);
      setTotalCount(0);
      setTakenCount(0);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getSeniorMedications({ seniorId, period: filter });
      if (requestId !== requestRef.current) return;

      const list = Array.isArray(data?.medications) ? data.medications : [];
      const computedTaken = list.filter(isMedicationTaken).length;

      setMedications(list);
      setTotalCount(Number.isFinite(Number.parseInt(data?.count, 10)) ? Number.parseInt(data.count, 10) : list.length);
      setTakenCount(
        Number.isFinite(Number.parseInt(data?.takenCount, 10))
          ? Number.parseInt(data.takenCount, 10)
          : computedTaken
      );
    } catch (apiError) {
      if (requestId !== requestRef.current) return;
      setMedications([]);
      setTotalCount(0);
      setTakenCount(0);
      setError(apiError?.message || "Impossible de charger les traitements.");
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [filter, seniorId]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const adherence = totalCount ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <Phone>
      <div style={{ fontFamily: PAGE_BODY_FONT }}>
        <div style={{ minHeight: "100vh", padding: "16px 16px 110px", color: T.navy }}>
          <div style={{ animation: "fadeUp .45s both", marginBottom: 14 }}>
            <h1 style={{ fontFamily: PAGE_TITLE_FONT, fontSize: 28, fontWeight: 400, lineHeight: 1.1, marginBottom: 8 }}>
              Traitements
            </h1>
            <p style={{ color: T.textLight, fontSize: 14, lineHeight: 1.6 }}>
              Vue medication avec adherence et statut de chaque prise.
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
              <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>Aucun senior relie</h2>
              <p style={{ fontSize: 14, color: T.textLight, lineHeight: 1.55, marginBottom: 12 }}>
                Associez un proche depuis Reglages pour charger les traitements.
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
                <div style={{ fontSize: 12, opacity: 0.84, fontWeight: 800, marginBottom: 7 }}>Adherence du jour</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
                  <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 900 }}>{adherence}%</div>
                  <div style={{ textAlign: "right", fontSize: 13, lineHeight: 1.4 }}>
                    <div>{takenCount} prise(s) confirmee(s)</div>
                    <div>{totalCount} au total</div>
                  </div>
                </div>
              </div>

              <div style={{ animation: "fadeUp .45s .08s both", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, marginBottom: 12 }}>
                <FilterChip label="Tous" active={filter === "all"} onClick={() => setFilter("all")} />
                <FilterChip label="Matin" active={filter === "matin"} onClick={() => setFilter("matin")} />
                <FilterChip label="Midi" active={filter === "midi"} onClick={() => setFilter("midi")} />
                <FilterChip label="Soir" active={filter === "soir"} onClick={() => setFilter("soir")} />
                <FilterChip label="Ponctuel" active={filter === "ponctuel"} onClick={() => setFilter("ponctuel")} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {loading && <p style={{ fontSize: 13, color: T.textLight }}>Chargement des traitements...</p>}
                {!loading && !!error && <p style={{ fontSize: 13, color: T.danger, fontWeight: 700 }}>{error}</p>}
                {!loading && !error && !medications.length && (
                  <p style={{ fontSize: 13, color: T.textLight }}>Aucun traitement pour cette periode.</p>
                )}
                {!loading && !error && medications.map((medication, index) => (
                  <div key={medication?.id ?? index} style={{ animation: `fadeUp .35s ${index * 0.04}s both` }}>
                    <MedicationCard medication={medication} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <FamilyBottomNav activeTab="family_health" onNavigate={onNavigate} />
      </div>
    </Phone>
  );
}
