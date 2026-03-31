import { useCallback, useEffect, useRef, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import {
  createMedication,
  deleteMedication,
  getAdherenceTrend,
  getSeniorMedications,
  updateMedication,
} from "../../services/homeApi";
import {
  formatFamilyDate,
  useFamilySeniorId,
} from "./familyUtils";

const BODY = "'DM Sans', sans-serif";
const SERIF = "'DM Serif Display', serif";

/* ─────────────────────────────────────────────────────────────
   Shared UI: Toast
───────────────────────────────────────────────────────────── */

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      minWidth: 200, padding: "12px 20px", borderRadius: 20,
      background: type === "error" ? T.danger : T.success,
      color: "white", fontSize: 13, fontWeight: 700, zIndex: 999,
      animation: "scaleIn 0.2s", textAlign: "center",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    }}>
      {message}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Shared UI: BottomSheet
───────────────────────────────────────────────────────────── */

function BottomSheet({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: "50%",
          width: "min(390px, 100vw)",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.4)", zIndex: 200,
        }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: "50%",
        width: "min(390px, 100vw)",
        transform: "translateX(-50%)",
        maxHeight: "85vh", overflowY: "auto",
        background: "white", borderRadius: "20px 20px 0 0",
        zIndex: 201, animation: "slideUp 0.25s",
        padding: "0 0 32px",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: "#CBD5E1" }} />
        </div>
        {title && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 16px 14px",
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: T.navy, fontFamily: SERIF }}>{title}</h3>
            <button
              type="button"
              aria-label="Fermer"
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "none", background: "#F1F5F9",
                color: T.navy, fontSize: 16, cursor: "pointer",
                display: "grid", placeItems: "center",
              }}
            >✕</button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Shared UI: ErrorRetry
───────────────────────────────────────────────────────────── */

function ErrorRetry({ message, onRetry }) {
  return (
    <div style={{ padding: "48px 20px", textAlign: "center" }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, margin: "0 auto 14px",
        background: "#FEF2F2", display: "grid", placeItems: "center", fontSize: 24,
      }}>⚠️</div>
      <p style={{ fontSize: 15, color: T.navy, fontWeight: 800, marginBottom: 6 }}>
        Erreur de chargement
      </p>
      <p style={{ fontSize: 13, color: T.textLight, lineHeight: 1.55, marginBottom: 18 }}>
        {message || "Impossible de charger les données."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          border: "none", borderRadius: 12, background: T.primary,
          color: "white", padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}
      >
        Réessayer
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────────────────────── */

const SHIMMER = {
  background: "linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.2s infinite",
};

function Bone({ w = "100%", h, r = 8, style }) {
  return <div style={{ width: w, height: h, borderRadius: r, ...SHIMMER, ...style }} />;
}

function HealthSkeleton() {
  return (
    <div style={{ padding: "0 0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      <Bone h={80} r={16} />
      <Bone h={44} r={999} />
      {[1, 2, 3].map(i => <Bone key={i} h={110} r={16} />)}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Adherence Bar Chart (7 days)
───────────────────────────────────────────────────────────── */

function adherenceColor(pct) {
  if (pct >= 80) return T.success;
  if (pct >= 50) return T.warning;
  return T.danger;
}

function AdherenceChart({ days }) {
  const MAX_H = 48;
  if (!Array.isArray(days) || !days.length) return null;
  const summary = days[days.length - 1];
  const pct = summary?.percentage ?? null;

  return (
    <section style={{
      background: "white", borderRadius: 16,
      boxShadow: "0 2px 12px rgba(13,148,136,0.08)",
      padding: "14px 14px 12px", marginBottom: 12,
      animation: "fadeUp .35s both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 900, color: T.navy }}>Observance 7 derniers jours</h3>
        {pct != null && (
          <span style={{
            fontSize: 12, fontWeight: 800,
            color: adherenceColor(pct),
          }}>{pct}%</span>
        )}
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${days.length},1fr)`,
        gap: 4, alignItems: "flex-end", minHeight: MAX_H + 20,
      }}>
        {days.map((d, i) => {
          const p = d.percentage ?? 0;
          const barH = Math.max(4, (p / 100) * MAX_H);
          const color = adherenceColor(p);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: "100%", maxWidth: 22, height: barH,
                borderRadius: "4px 4px 2px 2px", background: color,
                transition: "height 0.4s ease",
              }} />
              <span style={{ fontSize: 9.5, color: T.textLight, fontWeight: 700 }}>
                {formatFamilyDate(d.date).slice(0, 2)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Filter Chips
───────────────────────────────────────────────────────────── */

const PERIODS = [
  { id: "all", label: "Tous" },
  { id: "matin", label: "Matin" },
  { id: "midi", label: "Midi" },
  { id: "soir", label: "Soir" },
  { id: "ponctuel", label: "Ponctuel" },
];

function FilterChips({ active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 8, overflowX: "auto",
      paddingBottom: 4, marginBottom: 12, animation: "fadeUp .35s .05s both",
    }}>
      {PERIODS.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          style={{
            border: `1.5px solid ${active === p.id ? T.primary : "#E2E8F0"}`,
            background: active === p.id ? T.primary : "white",
            color: active === p.id ? "white" : T.textLight,
            borderRadius: 999, fontSize: 12, fontWeight: 800,
            padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}
        >{p.label}</button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Medication Card
───────────────────────────────────────────────────────────── */

function statusMeta(status) {
  const s = String(status || "").toLowerCase();
  if (s === "taken") return { label: "Pris", bg: T.successLight, color: T.success, accent: T.success };
  if (s === "missed") return { label: "Manqué", bg: T.dangerLight, color: T.danger, accent: T.danger };
  if (s === "upcoming") return { label: "À venir", bg: "#E9F7F5", color: T.primaryDark, accent: "#94A3B8" };
  return { label: "En attente", bg: T.warningLight, color: T.warning, accent: T.warning };
}

function MedicationCard({ medication, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);
  const meta = statusMeta(medication?.status);

  useEffect(() => {
    if (!confirming) return;
    timerRef.current = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(timerRef.current);
  }, [confirming]);

  return (
    <div style={{
      background: "white", borderRadius: 16,
      boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
      marginBottom: 10, overflow: "hidden",
      borderLeft: `4px solid ${meta.accent}`,
      animation: "fadeUp .3s both",
    }}>
      <div style={{ padding: "13px 13px 12px" }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: T.navy }}>{medication?.name || "Médicament"}</span>
              {medication?.dosage && (
                <span style={{
                  padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: "#F1F5F9", color: T.textLight,
                }}>{medication.dosage}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800,
              background: meta.bg, color: meta.color, whiteSpace: "nowrap",
            }}>{meta.label}</span>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Menu actions"
                onClick={() => setMenuOpen(v => !v)}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  border: "1px solid #E2E8F0", background: "white",
                  cursor: "pointer", display: "grid", placeItems: "center",
                  fontSize: 14, color: T.textLight,
                }}
              >⋯</button>
              {menuOpen && (
                <>
                  <div
                    onClick={() => setMenuOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  />
                  <div style={{
                    position: "absolute", right: 0, top: 32, zIndex: 20,
                    background: "white", borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    border: "1px solid #E2E8F0", overflow: "hidden", minWidth: 130,
                  }}>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onEdit(medication); }}
                      style={{
                        display: "block", width: "100%", padding: "10px 14px",
                        textAlign: "left", border: "none", background: "white",
                        fontSize: 13, fontWeight: 700, color: T.navy, cursor: "pointer",
                      }}
                    >✏️ Modifier</button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); setConfirming(true); }}
                      style={{
                        display: "block", width: "100%", padding: "10px 14px",
                        textAlign: "left", border: "none", background: "white",
                        fontSize: 13, fontWeight: 700, color: T.danger, cursor: "pointer",
                        borderTop: "1px solid #F1F5F9",
                      }}
                    >🗑️ Supprimer</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {medication?.time && (
            <span style={{
              padding: "3px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: "#F0FDFA", color: T.primary,
            }}>🕐 {medication.time}</span>
          )}
          {medication?.period && (
            <span style={{
              padding: "3px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: "#F8FAFC", color: T.textLight,
            }}>{medication.period}</span>
          )}
          {medication?.frequency && (
            <span style={{ fontSize: 11, color: T.textLight, alignSelf: "center" }}>
              {medication.frequency}
            </span>
          )}
        </div>

        {/* Instruction */}
        {medication?.instruction && (
          <p style={{ marginTop: 8, fontSize: 12, color: T.textLight, fontStyle: "italic", lineHeight: 1.45 }}>
            {medication.instruction}
          </p>
        )}

        {/* Inline confirm */}
        {confirming && (
          <div style={{
            marginTop: 10, display: "flex", gap: 8,
            animation: "fadeIn 0.15s",
          }}>
            <button
              type="button"
              onClick={() => { setConfirming(false); onDelete(medication.id); }}
              style={{
                flex: 1, border: "none", borderRadius: 10,
                background: T.danger, color: "white",
                padding: "9px 0", fontSize: 12, fontWeight: 800, cursor: "pointer",
              }}
            >Confirmer</button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              style={{
                flex: 1, border: "1px solid #E2E8F0", borderRadius: 10,
                background: "white", color: T.navy,
                padding: "9px 0", fontSize: 12, fontWeight: 800, cursor: "pointer",
              }}
            >Annuler</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Medication Form (Add / Edit)
───────────────────────────────────────────────────────────── */

const EMPTY_FORM = { name: "", dosage: "", time: "", period: "matin", frequency: "", instruction: "" };

function MedForm({ initial, onSubmit, onClose, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!initial?.id;

  const labelStyle = {
    position: "absolute", width: 1, height: 1,
    overflow: "hidden", clip: "rect(0 0 0 0)",
  };
  const inputStyle = {
    width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10,
    padding: "10px 12px", fontSize: 14, color: T.navy, background: "white",
    outline: "none", fontFamily: BODY,
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label htmlFor="med-name" style={labelStyle}>Nom</label>
          <input
            id="med-name"
            style={inputStyle}
            placeholder="Nom du médicament *"
            value={form.name}
            onChange={e => set("name", e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="med-dosage" style={labelStyle}>Dosage</label>
          <input
            id="med-dosage"
            style={inputStyle}
            placeholder="Dosage (ex: 500mg)"
            value={form.dosage}
            onChange={e => set("dosage", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="med-time" style={labelStyle}>Heure</label>
          <input
            id="med-time"
            type="time"
            style={inputStyle}
            value={form.time}
            onChange={e => set("time", e.target.value)}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 6 }}>
            Période
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {["matin", "midi", "soir", "ponctuel"].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => set("period", p)}
                style={{
                  flex: 1, border: `1.5px solid ${form.period === p ? T.primary : "#E2E8F0"}`,
                  background: form.period === p ? T.primary : "white",
                  color: form.period === p ? "white" : T.textLight,
                  borderRadius: 10, padding: "8px 4px",
                  fontSize: 11, fontWeight: 800, cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >{p}</button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="med-freq" style={labelStyle}>Fréquence</label>
          <input
            id="med-freq"
            style={inputStyle}
            placeholder="Fréquence (ex: 1 fois par jour)"
            value={form.frequency}
            onChange={e => set("frequency", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="med-instruction" style={labelStyle}>Instruction</label>
          <input
            id="med-instruction"
            style={inputStyle}
            placeholder="Instruction (optionnel)"
            value={form.instruction}
            onChange={e => set("instruction", e.target.value)}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: 16, width: "100%", border: "none", borderRadius: 12,
          background: loading ? "#CBD5E1" : `linear-gradient(135deg,${T.primary},${T.primaryDark})`,
          color: "white", padding: "13px 0", fontSize: 14, fontWeight: 800,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Ajouter le médicament"}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main — FamilyHealth
───────────────────────────────────────────────────────────── */

export default function FamilyHealth({ user, onNavigate = () => {} }) {
  const { seniorId, isResolvingSenior } = useFamilySeniorId(user);

  const [filter, setFilter] = useState("all");
  const [medications, setMedications] = useState([]);
  const [adherenceDays, setAdherenceDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [sheetMode, setSheetMode] = useState(null); // null | "add" | { mode: "edit", med }
  const [submitting, setSubmitting] = useState(false);
  const requestRef = useRef(0);

  const showToast = useCallback((type, message) => setToast({ type, message }), []);

  const fetchData = useCallback(async () => {
    if (!seniorId) {
      if (isResolvingSenior) {
        setLoading(true);
        setError(null);
        return;
      }
      setLoading(false);
      return;
    }
    const reqId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const [medRes, adh] = await Promise.allSettled([
        getSeniorMedications({ seniorId, period: filter }),
        getAdherenceTrend({ seniorId, days: 7 }),
      ]);

      if (reqId !== requestRef.current) return;

      if (medRes.status === "fulfilled") {
        setMedications(Array.isArray(medRes.value?.medications) ? medRes.value.medications : []);
      } else {
        setError(medRes.reason?.message || "Impossible de charger les traitements.");
      }

      if (adh.status === "fulfilled") {
        const arr = Array.isArray(adh.value?.days) ? adh.value.days : [];
        setAdherenceDays(arr);
      }
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, [filter, isResolvingSenior, seniorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = useCallback(async (form) => {
    setSubmitting(true);
    try {
      await createMedication({ seniorId, ...form });
      showToast("success", "Médicament ajouté.");
      setSheetMode(null);
      fetchData();
    } catch (err) {
      showToast("error", err?.message || "Erreur lors de l'ajout.");
    } finally {
      setSubmitting(false);
    }
  }, [seniorId, fetchData, showToast]);

  const handleEdit = useCallback(async (form) => {
    setSubmitting(true);
    try {
      await updateMedication({ medicationId: form.id, ...form });
      showToast("success", "Médicament mis à jour.");
      setSheetMode(null);
      fetchData();
    } catch (err) {
      showToast("error", err?.message || "Erreur lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  }, [fetchData, showToast]);

  const handleDelete = useCallback(async (medicationId) => {
    try {
      await deleteMedication({ medicationId });
      showToast("success", "Médicament supprimé.");
      setMedications(prev => prev.filter(m => m.id !== medicationId));
    } catch (err) {
      showToast("error", err?.message || "Erreur lors de la suppression.");
    }
  }, [showToast]);

  const isAddSheet = sheetMode === "add";
  const isEditSheet = sheetMode && sheetMode !== "add";

  return (
    <Phone>
      <div style={{ fontFamily: BODY }}>
        <div style={{ minHeight: "100vh", background: "#F8F6FF", padding: "16px 16px 110px", color: T.navy }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, lineHeight: 1.1 }}>
              Médicaments
            </h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                aria-label="Actualiser"
                onClick={fetchData}
                disabled={loading}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: "1px solid #E2E8F0", background: "white",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "grid", placeItems: "center",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <Icon.Refresh />
              </button>
              <button
                type="button"
                aria-label="Ajouter un médicament"
                onClick={() => setSheetMode("add")}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: "none", background: T.primary,
                  color: "white", fontSize: 22, cursor: "pointer",
                  display: "grid", placeItems: "center",
                }}
              >+</button>
            </div>
          </div>

          {!seniorId && !isResolvingSenior ? (
            <div style={{
              background: "white", borderRadius: 20, padding: 18,
              boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>Aucun senior relié</h2>
              <p style={{ fontSize: 14, color: T.textLight, lineHeight: 1.55, marginBottom: 12 }}>
                Associez un proche depuis Réglages pour charger les traitements.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("family_settings")}
                style={{
                  border: "none", borderRadius: 12,
                  background: T.primary, color: "white",
                  padding: "10px 14px", fontWeight: 800, cursor: "pointer",
                }}
              >
                Aller aux Réglages
              </button>
            </div>
          ) : (isResolvingSenior || loading) ? (
            <HealthSkeleton />
          ) : error ? (
            <ErrorRetry message={error} onRetry={fetchData} />
          ) : (
            <>
              {adherenceDays.length > 0 && <AdherenceChart days={adherenceDays} />}

              <FilterChips active={filter} onChange={setFilter} />

              {medications.length === 0 ? (
                <div style={{
                  background: "white", borderRadius: 16, padding: "24px 16px",
                  textAlign: "center", boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💊</div>
                  <p style={{ fontSize: 14, color: T.textLight }}>
                    Aucun traitement pour cette période.
                  </p>
                </div>
              ) : (
                <div>
                  {medications.map((med, i) => (
                    <div key={med?.id ?? i}>
                      <MedicationCard
                        medication={med}
                        onEdit={(m) => setSheetMode({ mode: "edit", med: m })}
                        onDelete={handleDelete}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <FamilyBottomNav activeTab="family_health" onNavigate={onNavigate} />

        {/* Add Sheet */}
        <BottomSheet
          open={isAddSheet}
          onClose={() => setSheetMode(null)}
          title="Nouveau médicament"
        >
          <MedForm
            initial={null}
            onSubmit={handleAdd}
            onClose={() => setSheetMode(null)}
            loading={submitting}
          />
        </BottomSheet>

        {/* Edit Sheet */}
        <BottomSheet
          open={isEditSheet}
          onClose={() => setSheetMode(null)}
          title="Modifier le médicament"
        >
          {isEditSheet && (
            <MedForm
              initial={sheetMode.med}
              onSubmit={handleEdit}
              onClose={() => setSheetMode(null)}
              loading={submitting}
            />
          )}
        </BottomSheet>

        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        )}
      </div>
    </Phone>
  );
}
