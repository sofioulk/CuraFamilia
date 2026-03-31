import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import {
  createAppointment,
  deleteAppointment,
  getSeniorHome,
  updateAppointment,
} from "../../services/homeApi";
import {
  formatFamilyDate,
  formatFamilyDateTime,
  getMedicationStatusMeta,
  useFamilySeniorId,
} from "./familyUtils";
import {
  addDaysToLocalDateKey,
  parseLocalDateTime,
  toDateTimeLocalInputValue,
  toLocalDateKey,
} from "../../utils/dateTime";

const BODY = "'DM Sans', sans-serif";
const SERIF = "'DM Serif Display', serif";

/* ─────────────────────────────────────────────────────────────
   Date helpers
───────────────────────────────────────────────────────────── */

function toDateStr(d) {
  return toLocalDateKey(d);
}

function addDays(dateStr, n) {
  return addDaysToLocalDateKey(dateStr, n);
}

function buildWeek(centerStr) {
  const result = [];
  for (let i = -3; i <= 3; i++) {
    result.push(addDays(centerStr, i));
  }
  return result;
}

const FR_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

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
          background: "rgba(0,0,0,0.4)",
          zIndex: 200,
        }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: "50%",
        width: "min(390px, 100vw)",
        transform: "translateX(-50%)",
        maxHeight: "85vh", overflowY: "auto",
        background: "white", borderRadius: "20px 20px 0 0",
        zIndex: 201, animation: "slideUp 0.25s", padding: "0 0 32px",
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
              type="button" aria-label="Fermer" onClick={onClose}
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
   Skeleton & ErrorRetry
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
        {message}
      </p>
      <button
        type="button" onClick={onRetry}
        style={{
          border: "none", borderRadius: 12, background: T.primary,
          color: "white", padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}
      >Réessayer</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Week Strip
───────────────────────────────────────────────────────────── */

function WeekStrip({ selectedDate, onSelect, appointmentDates }) {
  const today = toDateStr(new Date());
  const week = buildWeek(selectedDate);
  const apptSet = new Set(appointmentDates || []);

  return (
    <div style={{
      display: "flex", gap: 4, overflowX: "auto",
      paddingBottom: 4, marginBottom: 12,
    }}>
      {week.map(dateStr => {
        const d = parseLocalDateTime(dateStr);
        const isToday = dateStr === today;
        const isSelected = dateStr === selectedDate;
        const hasAppt = apptSet.has(dateStr);

        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onSelect(dateStr)}
            style={{
              flex: "0 0 auto", width: 44, minHeight: 60,
              borderRadius: 14, border: "none", cursor: "pointer",
              background: isSelected ? T.primary : isToday ? "#F0FDFA" : "white",
              color: isSelected ? "white" : isToday ? T.primary : T.navy,
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3, padding: "6px 0",
              boxShadow: isSelected ? "0 4px 14px rgba(13,148,136,0.25)" : "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.75 }}>
              {FR_SHORT[d?.getDay?.() ?? 0]}
            </span>
            <span style={{ fontSize: 15, fontWeight: 900 }}>{d?.getDate?.() ?? "--"}</span>
            {hasAppt && (
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: isSelected ? "rgba(255,255,255,0.8)" : T.primary,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Appointment Card
───────────────────────────────────────────────────────────── */

function apptStatusMeta(status) {
  const s = String(status || "scheduled").toLowerCase();
  if (s === "done" || s === "completed") return { label: "Effectué", bg: T.successLight, color: T.success };
  if (s === "cancelled" || s === "canceled") return { label: "Annulé", bg: "#F1F5F9", color: T.textLight, strikethrough: true };
  return { label: "Planifié", bg: "#EFF6FF", color: "#1D4ED8" };
}

function ApptCard({ appt, onEdit, onCancel }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);
  const meta = apptStatusMeta(appt?.status);

  useEffect(() => {
    if (!confirming) return;
    timerRef.current = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(timerRef.current);
  }, [confirming]);

  return (
    <div style={{
      background: "white", borderRadius: 16,
      boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
      marginBottom: 10, padding: "13px 13px 12px",
      animation: "fadeUp .3s both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 15, fontWeight: 900, color: T.navy,
              textDecoration: meta.strikethrough ? "line-through" : "none",
            }}>
              {appt?.specialty || "Consultation"}
            </span>
            <span style={{
              padding: "2px 8px", borderRadius: 999,
              fontSize: 11, fontWeight: 800,
              background: meta.bg, color: meta.color,
            }}>{meta.label}</span>
          </div>
          {appt?.doctorName && (
            <p style={{ marginTop: 4, fontSize: 13, color: T.textLight, fontWeight: 700 }}>
              Dr. {appt.doctorName}
            </p>
          )}
          {appt?.appointmentAt && (
            <p style={{ marginTop: 3, fontSize: 12, color: T.primary, fontWeight: 700 }}>
              📅 {formatFamilyDateTime(appt.appointmentAt)}
            </p>
          )}
          {appt?.notes && (
            <p style={{ marginTop: 6, fontSize: 12, color: T.textLight, fontStyle: "italic", lineHeight: 1.45 }}>
              {appt.notes}
            </p>
          )}
        </div>

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
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
              <div style={{
                position: "absolute", right: 0, top: 32, zIndex: 20,
                background: "white", borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                border: "1px solid #E2E8F0", overflow: "hidden", minWidth: 140,
              }}>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onEdit(appt); }}
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
                >🚫 Annuler</button>
              </div>
            </>
          )}
        </div>
      </div>

      {confirming && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, animation: "fadeIn 0.15s" }}>
          <button
            type="button"
            onClick={() => { setConfirming(false); onCancel(appt.id); }}
            style={{
              flex: 1, border: "none", borderRadius: 10,
              background: T.danger, color: "white",
              padding: "9px 0", fontSize: 12, fontWeight: 800, cursor: "pointer",
            }}
          >Confirmer l'annulation</button>
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
  );
}

/* ─────────────────────────────────────────────────────────────
   Appointment Form
───────────────────────────────────────────────────────────── */

const EMPTY_APPT = { specialty: "", doctorName: "", appointmentAt: "", notes: "", status: "scheduled" };
const APPT_STATUSES = [
  { id: "scheduled", label: "Planifié" },
  { id: "done", label: "Effectué" },
  { id: "cancelled", label: "Annulé" },
];

function ApptForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(() => (
    initial
      ? { ...initial, appointmentAt: toDateTimeLocalInputValue(initial.appointmentAt) }
      : EMPTY_APPT
  ));
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
    if (!form.specialty.trim()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label htmlFor="appt-spec" style={labelStyle}>Spécialité</label>
          <input
            id="appt-spec"
            style={inputStyle}
            placeholder="Spécialité (ex: Cardiologue) *"
            value={form.specialty}
            onChange={e => set("specialty", e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="appt-doc" style={labelStyle}>Médecin</label>
          <input
            id="appt-doc"
            style={inputStyle}
            placeholder="Nom du médecin"
            value={form.doctorName}
            onChange={e => set("doctorName", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="appt-at" style={labelStyle}>Date et heure</label>
          <input
            id="appt-at"
            type="datetime-local"
            style={inputStyle}
            value={form.appointmentAt}
            onChange={e => set("appointmentAt", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="appt-notes" style={labelStyle}>Notes</label>
          <textarea
            id="appt-notes"
            style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
            placeholder="Notes (optionnel)"
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
          />
        </div>
        {isEdit && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 6 }}>
              Statut
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {APPT_STATUSES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("status", s.id)}
                  style={{
                    flex: 1,
                    border: `1.5px solid ${form.status === s.id ? T.primary : "#E2E8F0"}`,
                    background: form.status === s.id ? T.primary : "white",
                    color: form.status === s.id ? "white" : T.textLight,
                    borderRadius: 10, padding: "8px 4px",
                    fontSize: 11, fontWeight: 800, cursor: "pointer",
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>
        )}
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
        {loading ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Ajouter le rendez-vous"}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
   Read-only Medication Row
───────────────────────────────────────────────────────────── */

function MedRow({ medication }) {
  const meta = getMedicationStatusMeta(medication?.status);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "60px 1fr auto",
      alignItems: "center", gap: 10,
      padding: "10px 0", borderBottom: "1px solid #F1F5F9",
    }}>
      <strong style={{ fontSize: 13, color: T.primary }}>{medication?.time || "--:--"}</strong>
      <div>
        <div style={{ fontSize: 14, color: T.navy, fontWeight: 800 }}>
          {medication?.name || "Médicament"}
        </div>
        <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{medication?.dosage}</div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 800, borderRadius: 999,
        padding: "4px 8px", background: meta.bg, color: meta.color, whiteSpace: "nowrap",
      }}>
        {meta.label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main — FamilyCalendar
───────────────────────────────────────────────────────────── */

export default function FamilyCalendar({ user, onNavigate = () => {} }) {
  const { seniorId, isResolvingSenior } = useFamilySeniorId(user);

  const today = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState("appointments");
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [sheetMode, setSheetMode] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = useCallback((type, msg) => setToast({ type, message: msg }), []);

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
    setLoading(true);
    setError(null);
    try {
      const data = await getSeniorHome({ seniorId, date: selectedDate });
      setHomeData(data);
    } catch (err) {
      setError(err?.message || "Impossible de charger l'agenda.");
    } finally {
      setLoading(false);
    }
  }, [isResolvingSenior, selectedDate, seniorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allKnownAppointments = useMemo(() => {
    const raw = Array.isArray(homeData?.appointments) ? homeData.appointments.filter(Boolean) : [];
    if (raw.length > 0) {
      return raw;
    }
    return homeData?.nextAppointment ? [homeData.nextAppointment] : [];
  }, [homeData]);

  const appointments = useMemo(() => {
    return allKnownAppointments.filter((appointment) => {
      const status = String(appointment?.status || "scheduled").toLowerCase();
      if (status === "cancelled" || status === "canceled") {
        return false;
      }

      return toDateStr(appointment?.appointmentAt) === selectedDate;
    });
  }, [allKnownAppointments, selectedDate]);

  const medications = useMemo(() => {
    if (!Array.isArray(homeData?.medications)) return [];
    return [...homeData.medications].sort((a, b) => {
      const toMin = t => {
        const m = String(t || "").match(/^(\d{1,2}):(\d{2})$/);
        return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 9999;
      };
      return toMin(a?.time) - toMin(b?.time);
    });
  }, [homeData]);

  const apptDates = useMemo(() => {
    return allKnownAppointments
      .filter((appointment) => {
        const status = String(appointment?.status || "scheduled").toLowerCase();
        return status !== "cancelled" && status !== "canceled";
      })
      .map(a => a?.appointmentAt ? toDateStr(a.appointmentAt) : null)
      .filter(Boolean);
  }, [allKnownAppointments]);

  const handleAddAppt = useCallback(async (form) => {
    setSubmitting(true);
    try {
      await createAppointment({ seniorId, ...form });
      showToast("success", "Rendez-vous ajouté.");
      setSheetMode(null);
      fetchData();
    } catch (err) {
      showToast("error", err?.message || "Erreur lors de l'ajout.");
    } finally {
      setSubmitting(false);
    }
  }, [seniorId, fetchData, showToast]);

  const handleEditAppt = useCallback(async (form) => {
    setSubmitting(true);
    try {
      await updateAppointment({ appointmentId: form.id, ...form });
      showToast("success", "Rendez-vous mis à jour.");
      setSheetMode(null);
      fetchData();
    } catch (err) {
      showToast("error", err?.message || "Erreur lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  }, [fetchData, showToast]);

  const handleCancelAppt = useCallback(async (appointmentId) => {
    try {
      await deleteAppointment({ appointmentId });
      showToast("success", "Rendez-vous annulé.");
      fetchData();
    } catch (err) {
      showToast("error", err?.message || "Erreur lors de l'annulation.");
    }
  }, [fetchData, showToast]);

  const isAddSheet = sheetMode === "add";
  const isEditSheet = sheetMode && sheetMode !== "add";

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => setActiveTab(id)}
      style={{
        flex: 1, border: "none", borderRadius: 10,
        background: activeTab === id ? T.primary : "transparent",
        color: activeTab === id ? "white" : T.textLight,
        padding: "8px 0", fontSize: 13, fontWeight: 800, cursor: "pointer",
      }}
    >{label}</button>
  );

  return (
    <Phone>
      <div style={{ fontFamily: BODY }}>
        <div style={{ minHeight: "100vh", background: "#F8F6FF", padding: "16px 16px 110px", color: T.navy }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, lineHeight: 1.1 }}>Agenda</h1>
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
            ><Icon.Refresh /></button>
          </div>

          {!seniorId && !isResolvingSenior ? (
            <div style={{ background: "white", borderRadius: 20, padding: 18, boxShadow: "0 2px 12px rgba(108,99,255,0.08)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>Agenda indisponible</h2>
              <p style={{ fontSize: 14, color: T.textLight, lineHeight: 1.55, marginBottom: 12 }}>
                Associez un senior depuis Réglages pour afficher les rendez-vous.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("family_settings")}
                style={{
                  border: "none", borderRadius: 12, background: T.primary,
                  color: "white", padding: "10px 14px", fontWeight: 800, cursor: "pointer",
                }}
              >Aller aux Réglages</button>
            </div>
          ) : (
            <>
              {/* Week Strip */}
              <WeekStrip
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                appointmentDates={apptDates}
              />

              {/* Date label */}
              <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 700, color: T.textLight }}>
                {formatFamilyDate(selectedDate)}
              </div>

              {/* Tab Bar */}
              <div style={{
                display: "flex", gap: 4, background: "#F1F5F9",
                borderRadius: 12, padding: 4, marginBottom: 12,
              }}>
                {tabBtn("appointments", "Rendez-vous")}
                {tabBtn("medications", "Médicaments")}
              </div>

              {(isResolvingSenior || loading) ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1, 2].map(i => (
                    <div key={i} style={{
                      height: 100, borderRadius: 16,
                      background: "linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.2s infinite",
                    }} />
                  ))}
                </div>
              ) : error ? (
                <ErrorRetry message={error} onRetry={fetchData} />
              ) : activeTab === "appointments" ? (
                <>
                  {appointments.length === 0 ? (
                    <div style={{
                      background: "white", borderRadius: 16, padding: "24px 16px",
                      textAlign: "center", boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                      <p style={{ fontSize: 14, color: T.textLight }}>Aucun rendez-vous ce jour.</p>
                    </div>
                  ) : (
                    appointments.map((appt, i) => (
                      <ApptCard
                        key={appt?.id ?? i}
                        appt={appt}
                        onEdit={a => setSheetMode({ mode: "edit", appt: a })}
                        onCancel={handleCancelAppt}
                      />
                    ))
                  )}

                  {/* FAB */}
                  <div style={{
                    position: "fixed",
                    left: "50%",
                    bottom: 0,
                    width: "min(390px, 100vw)",
                    transform: "translateX(-50%)",
                    zIndex: 50,
                    pointerEvents: "none",
                  }}>
                    <button
                      type="button"
                      onClick={() => setSheetMode("add")}
                      style={{
                        position: "absolute", bottom: 90, right: 20,
                        width: 52, height: 52, borderRadius: "50%",
                        border: "none", background: T.primary,
                        color: "white", fontSize: 26, cursor: "pointer",
                        boxShadow: "0 6px 20px rgba(13,148,136,0.36)",
                        display: "grid", placeItems: "center",
                        pointerEvents: "auto",
                      }}
                      aria-label="Ajouter un rendez-vous"
                    >+</button>
                  </div>
                </>
              ) : (
                /* Médicaments tab — read-only */
                medications.length === 0 ? (
                  <div style={{
                    background: "white", borderRadius: 16, padding: "24px 16px",
                    textAlign: "center", boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>💊</div>
                    <p style={{ fontSize: 14, color: T.textLight }}>Aucune prise planifiée ce jour.</p>
                  </div>
                ) : (
                  <div style={{
                    background: "white", borderRadius: 16,
                    boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
                    padding: "4px 14px",
                  }}>
                    {medications.map((med, i) => (
                      <MedRow key={med?.id ?? i} medication={med} />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>

        <FamilyBottomNav activeTab="family_calendar" onNavigate={onNavigate} />

        {/* Add Sheet */}
        <BottomSheet open={isAddSheet} onClose={() => setSheetMode(null)} title="Nouveau rendez-vous">
          <ApptForm initial={null} onSubmit={handleAddAppt} loading={submitting} />
        </BottomSheet>

        {/* Edit Sheet */}
        <BottomSheet open={isEditSheet} onClose={() => setSheetMode(null)} title="Modifier le rendez-vous">
          {isEditSheet && (
            <ApptForm initial={sheetMode.appt} onSubmit={handleEditAppt} loading={submitting} />
          )}
        </BottomSheet>

        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        )}
      </div>
    </Phone>
  );
}
