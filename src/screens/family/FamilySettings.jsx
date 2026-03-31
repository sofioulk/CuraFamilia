import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import {
  getEffectiveFamilyUser,
  normalizeLinkedSenior,
  persistActiveFamilySenior,
  useFamilySeniorId,
} from "./familyUtils";
import {
  getLinkedSeniors,
  getSeniorApiProfile,
  unlinkSenior,
  updateSeniorProfile,
  useLinkCode as redeemLinkCode,
  verifyLinkCode,
} from "../../services/homeApi";
import { clearStoredAuthSession } from "../../utils/authStorage";

const BODY = "'DM Sans', sans-serif";
const SERIF = "'DM Serif Display', serif";
const SETTINGS_KEY = "cura_family_settings";

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
   iOS-style Toggle
───────────────────────────────────────────────────────────── */

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      style={{
        width: 50, height: 28, borderRadius: 999,
        border: "none", background: enabled ? T.primary : "#CBD5E1",
        position: "relative", cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: enabled ? 25 : 3,
        width: 22, height: 22, borderRadius: "50%",
        background: "white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.14)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Senior Profile Sheet
───────────────────────────────────────────────────────────── */

const PROFILE_FIELDS = [
  { key: "dateOfBirth", label: "Date de naissance", type: "date" },
  { key: "city", label: "Ville", type: "text" },
  { key: "chronicDiseases", label: "Maladies chroniques", type: "text" },
  { key: "bloodType", label: "Groupe sanguin", type: "text" },
  { key: "allergies", label: "Allergies", type: "text" },
  { key: "mainDoctorName", label: "Médecin principal", type: "text" },
  { key: "emergencyContactName", label: "Contact urgence — Nom", type: "text" },
  { key: "emergencyContactPhone", label: "Contact urgence — Téléphone", type: "tel" },
  { key: "emergencyContactRelation", label: "Lien de parenté", type: "text" },
  { key: "specialNote", label: "Note spéciale", type: "text" },
];

function SeniorProfileSheet({ seniorId, showToast }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!seniorId) return;
    setLoading(true);
    setError(null);
    getSeniorApiProfile({ seniorId })
      .then(data => {
        setProfile(data);
        setForm(data || {});
      })
      .catch(err => setError(err?.message || "Impossible de charger le profil."))
      .finally(() => setLoading(false));
  }, [seniorId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSeniorProfile({ seniorId, profileData: form });
      setProfile(form);
      setEditing(false);
      showToast("success", "Profil mis à jour.");
    } catch (err) {
      showToast("error", err?.message || "Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10,
    padding: "10px 12px", fontSize: 14, color: T.navy, background: "white",
    outline: "none", fontFamily: BODY,
  };

  return (
    <div style={{ padding: "0 16px" }}>
      {loading ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: T.textLight, fontSize: 13 }}>
          Chargement...
        </div>
      ) : error ? (
        <div style={{ padding: "16px 0", textAlign: "center", color: T.danger, fontSize: 13 }}>
          {error}
        </div>
      ) : (
        <>
          {PROFILE_FIELDS.map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700,
                color: T.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5,
              }}>{f.label}</label>
              {editing ? (
                <input
                  type={f.type}
                  style={inputStyle}
                  value={form[f.key] || ""}
                  onChange={e => setForm(fv => ({ ...fv, [f.key]: e.target.value }))}
                />
              ) : (
                <p style={{ fontSize: 14, color: T.navy, fontWeight: 600, padding: "6px 0" }}>
                  {profile?.[f.key] || <span style={{ color: T.textLight }}>Non renseigné</span>}
                </p>
              )}
            </div>
          ))}

          {editing ? (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, border: "none", borderRadius: 12,
                  background: saving ? "#CBD5E1" : T.primary,
                  color: "white", padding: "12px 0",
                  fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
                }}
              >{saving ? "Enregistrement..." : "Enregistrer"}</button>
              <button
                type="button"
                onClick={() => { setEditing(false); setForm(profile || {}); }}
                style={{
                  flex: 1, border: "1px solid #E2E8F0", borderRadius: 12,
                  background: "white", color: T.navy,
                  padding: "12px 0", fontSize: 14, fontWeight: 800, cursor: "pointer",
                }}
              >Annuler</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                width: "100%", marginTop: 8, border: `1.5px solid ${T.primary}`,
                borderRadius: 12, background: "white", color: T.primary,
                padding: "12px 0", fontSize: 14, fontWeight: 800, cursor: "pointer",
              }}
            >✏️ Modifier</button>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   6-digit Code Entry
───────────────────────────────────────────────────────────── */

function CodeEntry({ onSuccess, showToast }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [preview, setPreview] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [using, setUsing] = useState(false);
  const [shake, setShake] = useState(false);
  const [inlineMessage, setInlineMessage] = useState("");
  const inputRefs = useRef([]);

  const fullCode = digits.join("");

  const getReadableLinkError = (error) => {
    const message = String(error?.message || "").trim();
    if (/only family accounts can perform this action/i.test(message)) {
      return "Connectez-vous avec un compte famille pour associer un senior.";
    }
    return message || "Code invalide.";
  };

  const applyCodeDigits = (startIndex, rawValue) => {
    const sanitized = String(rawValue || "").replace(/\D/g, "");
    if (!sanitized) {
      return;
    }

    const next = [...digits];
    let writeIndex = startIndex;

    for (let i = 0; i < sanitized.length && writeIndex < next.length; i += 1) {
      next[writeIndex] = sanitized[i];
      writeIndex += 1;
    }

    setDigits(next);
    setInlineMessage("");

    const completedCode = next.join("");
    if (next.every(Boolean) && completedCode.length === 6) {
      doVerify(completedCode);
      return;
    }

    const focusIndex = Math.min(writeIndex, next.length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleDigit = (i, val) => {
    const sanitized = val.replace(/\D/g, "");
    if (sanitized.length > 1) {
      applyCodeDigits(i, sanitized);
      return;
    }

    const d = sanitized.slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setInlineMessage("");
    if (d && i < 5) {
      inputRefs.current[i + 1]?.focus();
    }
    if (next.every(Boolean) && next.join("").length === 6) {
      doVerify(next.join(""));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (i, e) => {
    const pasted = e.clipboardData?.getData("text") || "";
    if (!pasted) {
      return;
    }

    e.preventDefault();
    applyCodeDigits(i, pasted);
  };

  const doVerify = async (code) => {
    setVerifying(true);
    setPreview(null);
    setInlineMessage("");
    try {
      const data = await verifyLinkCode({ code });
      if (!data?.valid || !data?.senior?.id) {
        setInlineMessage(data?.message || "Ce code n'est pas valide.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      setPreview(data);
      if (data?.message) {
        setInlineMessage(data.message);
      }
    } catch (err) {
      showToast("error", getReadableLinkError(err));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const doUse = async () => {
    setUsing(true);
    try {
      const data = await redeemLinkCode({ code: fullCode });
      showToast("success", "Liaison établie avec succès !");
      onSuccess(data);
    } catch (err) {
      showToast("error", getReadableLinkError(err) || "Impossible de lier ce senior.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setUsing(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: T.textLight, marginBottom: 12 }}>
        Saisissez le code de liaison affiché sur l'appareil du senior pour établir la connexion.
      </p>
      <div style={{
        display: "flex", gap: 8, justifyContent: "center",
        animation: shake ? "shake 0.4s" : undefined,
      }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={e => handlePaste(i, e)}
            style={{
              width: 44, height: 52, borderRadius: 12, textAlign: "center",
              border: `2px solid ${shake ? T.danger : d ? T.primary : "#E2E8F0"}`,
              fontSize: 22, fontWeight: 900, color: T.navy,
              outline: "none", fontFamily: BODY, background: "white",
              transition: "border-color 0.2s",
            }}
          />
        ))}
      </div>

      {verifying && (
        <p style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: T.textLight }}>
          Vérification...
        </p>
      )}

      {!verifying && inlineMessage && (
        <p style={{
          textAlign: "center",
          marginTop: 12,
          fontSize: 12,
          color: preview ? T.primaryDark : T.danger,
          fontWeight: 700,
        }}>
          {inlineMessage}
        </p>
      )}

      {preview && (
        <div style={{
          marginTop: 14, background: "#F0FDFA", borderRadius: 14, padding: 14,
          border: `1.5px solid ${T.teal100}`,
        }}>
          <p style={{ fontSize: 12, color: T.textLight, fontWeight: 700, marginBottom: 4 }}>Profil détecté</p>
          <p style={{ fontSize: 15, fontWeight: 900, color: T.navy }}>
            {preview.senior?.name || preview.name || "—"}
          </p>
          {(preview.senior?.city || preview.city) && (
            <p style={{ fontSize: 13, color: T.textLight, marginTop: 2 }}>
              {preview.senior?.city || preview.city}
            </p>
          )}
          <button
            type="button"
            onClick={doUse}
            disabled={using}
            style={{
              marginTop: 12, width: "100%", border: "none", borderRadius: 11,
              background: using ? "#CBD5E1" : T.primary,
              color: "white", padding: "11px 0",
              fontSize: 13, fontWeight: 800, cursor: using ? "not-allowed" : "pointer",
            }}
          >{using ? "Association en cours..." : "Associer ce senior"}</button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Senior Row
───────────────────────────────────────────────────────────── */

function SeniorRow({ senior, isActive, onSelect, onViewProfile, onUnlink, confirming, onConfirmUnlink, onCancelUnlink }) {
  const initials = (senior?.name || "?").charAt(0).toUpperCase();
  return (
    <div style={{
      padding: "12px 0",
      borderBottom: "1px solid #F1F5F9",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Avatar */}
        <button
          type="button"
          onClick={() => onSelect(senior)}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            border: "none", background: T.primary,
            color: "white", fontSize: 17, fontWeight: 800,
            cursor: "pointer", flexShrink: 0,
            display: "grid", placeItems: "center",
          }}
        >{initials}</button>

        {/* Info */}
        <div onClick={() => onSelect(senior)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: T.navy }}>{senior.name || "Senior"}</span>
            {isActive && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 999,
                background: T.successLight, color: T.success,
              }}>Actif ✓</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>
            {[senior.age ? `${senior.age} ans` : null, senior.city].filter(Boolean).join(" · ")}
          </div>
          {senior.linkedAt && (
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 1 }}>
              Lié le {new Date(senior.linkedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          )}
        </div>

        {/* Actions */}
        <button
          type="button"
          aria-label="Voir le profil"
          onClick={() => onViewProfile(senior)}
          style={{
            width: 34, height: 34, borderRadius: 10,
            border: "1px solid #E2E8F0", background: "white",
            color: T.textLight, cursor: "pointer",
            display: "grid", placeItems: "center", fontSize: 14,
          }}
        >›</button>
        <button
          type="button"
          aria-label="Délier ce senior"
          onClick={() => onUnlink(senior.id)}
          style={{
            width: 34, height: 34, borderRadius: 10,
            border: "1px solid #E2E8F0", background: "white",
            color: T.danger, cursor: "pointer",
            display: "grid", placeItems: "center", fontSize: 14,
          }}
        >🗑</button>
      </div>

      {/* Inline confirm */}
      {confirming && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, animation: "fadeIn 0.15s" }}>
          <button
            type="button"
            onClick={onConfirmUnlink}
            style={{
              flex: 1, border: "none", borderRadius: 10,
              background: T.danger, color: "white",
              padding: "9px 0", fontSize: 12, fontWeight: 800, cursor: "pointer",
            }}
          >Confirmer</button>
          <button
            type="button"
            onClick={onCancelUnlink}
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
   Main — FamilySettings
───────────────────────────────────────────────────────────── */

export default function FamilySettings({ user, onNavigate = () => {} }) {
  const effectiveUser = useMemo(() => getEffectiveFamilyUser(user), [user]);
  const { seniorId: activeSeniorId, setSeniorId: setActiveSeniorId } = useFamilySeniorId(user);

  // Settings
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  // Seniors
  const [seniors, setSeniors] = useState([]);
  const [seniorsLoading, setSeniorsLoading] = useState(true);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState(null);
  const unlinkTimerRef = useRef(null);

  // Sheets
  const [profileSheet, setProfileSheet] = useState(null); // { seniorId }
  const [codeSheet, setCodeSheet] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((type, msg) => setToast({ type, message: msg }), []);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (typeof p.smsAlerts === "boolean") setSmsAlerts(p.smsAlerts);
      if (typeof p.weeklyReport === "boolean") setWeeklyReport(p.weeklyReport);
      if (typeof p.pushNotifs === "boolean") setPushNotifs(p.pushNotifs);
    } catch (_) {}
  }, []);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ smsAlerts, weeklyReport, pushNotifs }));
    } catch (_) {}
  }, [smsAlerts, weeklyReport, pushNotifs]);

  // Load linked seniors
  const loadSeniors = useCallback(async () => {
    setSeniorsLoading(true);
    try {
      const data = await getLinkedSeniors();
      const list = Array.isArray(data?.seniors) ? data.seniors
        : Array.isArray(data) ? data : [];
      setSeniors(list);
      if (!activeSeniorId && list.length > 0) {
        const nextSeniorId = persistActiveFamilySenior(list[0]);
        if (nextSeniorId) {
          setActiveSeniorId(nextSeniorId);
        }
      }
    } catch (_) {
      setSeniors([]);
    } finally {
      setSeniorsLoading(false);
    }
  }, [activeSeniorId, setActiveSeniorId]);

  useEffect(() => { loadSeniors(); }, [loadSeniors]);

  // Unlink flow
  const handleUnlinkRequest = (seniorId) => {
    setConfirmUnlinkId(seniorId);
    clearTimeout(unlinkTimerRef.current);
    unlinkTimerRef.current = setTimeout(() => setConfirmUnlinkId(null), 5000);
  };

  const handleUnlinkConfirm = useCallback(async () => {
    const id = confirmUnlinkId;
    setConfirmUnlinkId(null);
    try {
      await unlinkSenior({ seniorId: id });
      showToast("success", "Senior délié.");
      loadSeniors();
    } catch (err) {
      showToast("error", err?.message || "Erreur lors du délien.");
    }
  }, [confirmUnlinkId, loadSeniors, showToast]);

  // Switch active senior
  const handleSelectSenior = (senior) => {
    const nextSeniorId = persistActiveFamilySenior(senior);
    if (!nextSeniorId) {
      return;
    }
    setActiveSeniorId(nextSeniorId);
  };

  // Logout
  const handleLogout = () => {
    clearStoredAuthSession();
    if (onNavigate) onNavigate("welcome");
    else window.location.reload();
  };

  const cardStyle = {
    background: "white", borderRadius: 16,
    boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
    marginBottom: 14,
  };

  const sectionTitle = (t) => (
    <h3 style={{
      fontSize: 11, color: T.textLight, fontWeight: 800,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8,
    }}>{t}</h3>
  );

  const rowStyle = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    gap: 12, padding: "12px 16px", borderBottom: "1px solid #F1F5F9",
  };

  return (
    <Phone>
      <div style={{ fontFamily: BODY }}>
        <div style={{ minHeight: "100vh", background: "#F8F6FF", padding: "16px 16px 110px", color: T.navy }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, lineHeight: 1.1, marginBottom: 18 }}>
            Réglages
          </h1>

          {/* ── Section A: Mes Séniors ── */}
          {sectionTitle("Mes Séniors")}
          <div style={cardStyle}>
            <div style={{ padding: "4px 16px" }}>
              {seniorsLoading ? (
                <div style={{ padding: "16px 0", textAlign: "center", color: T.textLight, fontSize: 13 }}>
                  Chargement...
                </div>
              ) : seniors.length === 0 ? (
                <div style={{ padding: "16px 0", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: T.textLight, marginBottom: 10 }}>
                    Aucun senior relié pour l'instant.
                  </p>
                </div>
              ) : (
                seniors.map(s => (
                  <SeniorRow
                    key={s.id}
                    senior={s}
                    isActive={String(s.id) === String(activeSeniorId)}
                    onSelect={handleSelectSenior}
                    onViewProfile={sen => setProfileSheet({ seniorId: sen.id })}
                    onUnlink={handleUnlinkRequest}
                    confirming={confirmUnlinkId === s.id}
                    onConfirmUnlink={handleUnlinkConfirm}
                    onCancelUnlink={() => setConfirmUnlinkId(null)}
                  />
                ))
              )}
            </div>

            {/* Add senior */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #F1F5F9" }}>
              <button
                type="button"
                onClick={() => setCodeSheet(true)}
                style={{
                  width: "100%", border: `1.5px solid ${T.primary}`,
                  borderRadius: 12, background: "white", color: T.primary,
                  padding: "11px 0", fontSize: 13, fontWeight: 800, cursor: "pointer",
                }}
              >
                + Associer un senior
              </button>
            </div>
          </div>

          {/* ── Section B: Alertes & Notifications ── */}
          {sectionTitle("Alertes & Notifications")}
          <div style={cardStyle}>
            <div style={rowStyle}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>Alertes SOS par SMS</div>
                <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>SMS immédiat en cas d'alerte</div>
              </div>
              <Toggle enabled={smsAlerts} onChange={setSmsAlerts} />
            </div>
            <div style={rowStyle}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>Rapport hebdomadaire</div>
                <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>Résumé des prises et check-ins</div>
              </div>
              <Toggle enabled={weeklyReport} onChange={setWeeklyReport} />
            </div>
            <div style={{ ...rowStyle, borderBottom: "none" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>Notifications push</div>
                <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>Notifications sur cet appareil</div>
              </div>
              <Toggle enabled={pushNotifs} onChange={setPushNotifs} />
            </div>
          </div>

          {/* ── Section C: Compte ── */}
          {sectionTitle("Compte")}
          <div style={cardStyle}>
            <div style={rowStyle}>
              <span style={{ fontSize: 13, color: T.textLight, fontWeight: 700 }}>Nom</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>
                {effectiveUser?.name || "Non renseigné"}
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: "none" }}>
              <span style={{ fontSize: 13, color: T.textLight, fontWeight: 700 }}>Email</span>
              <span style={{ fontSize: 13, color: T.navy, fontWeight: 600 }}>
                {effectiveUser?.email || "Non renseigné"}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%", border: "none", borderRadius: 14,
              background: "#FEF2F2", color: T.danger,
              padding: "14px 0", fontSize: 14, fontWeight: 800,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Icon.LogOut />
            Déconnexion
          </button>
        </div>

        <FamilyBottomNav activeTab="family_settings" onNavigate={onNavigate} />

        {/* Senior Profile Sheet */}
        <BottomSheet
          open={!!profileSheet}
          onClose={() => setProfileSheet(null)}
          title="Profil du senior"
        >
          {profileSheet && (
            <SeniorProfileSheet
              seniorId={profileSheet.seniorId}
              onClose={() => setProfileSheet(null)}
              showToast={showToast}
            />
          )}
        </BottomSheet>

        {/* Code Entry Sheet */}
        <BottomSheet
          open={codeSheet}
          onClose={() => setCodeSheet(false)}
          title="Saisir un code de liaison"
        >
          <div style={{ padding: "0 16px" }}>
            <CodeEntry
              onSuccess={(linkData) => {
                const normalizedSenior = normalizeLinkedSenior(linkData?.senior);
                const nextSeniorId = persistActiveFamilySenior(normalizedSenior);
                if (nextSeniorId) {
                  setActiveSeniorId(nextSeniorId);
                }
                if (normalizedSenior?.id) {
                  setSeniors((previous) => {
                    const withoutCurrent = previous.filter((senior) => String(senior?.id) !== String(normalizedSenior.id));
                    return [normalizedSenior, ...withoutCurrent];
                  });
                }
                setCodeSheet(false);
                loadSeniors();
              }}
              showToast={showToast}
            />
          </div>
        </BottomSheet>

        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        )}
      </div>
    </Phone>
  );
}
