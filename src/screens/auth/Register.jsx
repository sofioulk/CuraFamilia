import { useState } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { Field } from "../../components/ui/Field";
import { PrimaryBtn } from "../../components/ui/PrimaryBtn";
import { GhostBtn } from "../../components/ui/GhostBtn";
import { registerAuth } from "../../services/authApi";
import { formatDisplayName } from "../../utils/nameFormat";

const ROLES = [
  { id: "famille", icon: <Icon.Users />, label: "Membre de la famille", desc: "Je gère les médicaments de mes proches âgés" },
  { id: "senior", icon: <Icon.Heart />, label: "Senior", desc: "Je suis la personne suivie par ma famille" },
];

export default function Register({ onBack, onSuccess, onLogin }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "", pass: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validateStep1 = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Nom trop court";
    if (!form.email.includes("@")) e.email = "Email invalide";
    if (form.phone.replace(/\s/g, "").length < 8) e.phone = "Numéro invalide";
    return e;
  };

  const validateStep3 = () => {
    const e = {};
    if (form.pass.length < 6) e.pass = "Minimum 6 caractères";
    if (form.pass !== form.confirm) e.confirm = "Les mots de passe ne correspondent pas";
    return e;
  };

  const next = async () => {
    if (step === 1) {
      const e = validateStep1();
      if (Object.keys(e).length) {
        setErrors(e);
        return;
      }
      setErrors({});
      setStep(2);
    } else if (step === 2) {
      if (!form.role) {
        setErrors({ role: "Veuillez sélectionner un rôle" });
        return;
      }
      setErrors({});
      setStep(3);
    } else {
      const e = validateStep3();
      if (Object.keys(e).length) {
        setErrors(e);
        return;
      }
      setErrors({});
      setLoading(true);
      try {
        const result = await registerAuth({
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          password: form.pass,
        });
        onSuccess(result);
      } catch (err) {
        setErrors({ form: err.message || "Inscription impossible." });
      } finally {
        setLoading(false);
      }
    }
  };

  const strengthLevel = form.pass.length === 0 ? 0 : form.pass.length < 6 ? 1 : form.pass.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Faible", "Moyen", "Fort"][strengthLevel];
  const strengthColor = ["", T.danger, T.warning, T.success][strengthLevel];

  return (
    <Phone>
      <div style={{ padding: "20px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={step === 1 ? onBack : () => setStep((p) => p - 1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: T.textLight,
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 14,
            fontWeight: 500,
            padding: 0,
          }}
        >
          <Icon.ArrowLeft />
          Retour
        </button>
        <span style={{ fontSize: 13, color: T.textLight, fontWeight: 500 }}>Étape {step} / 3</span>
      </div>

      <div style={{ padding: "16px 28px 0" }}>
        <div style={{ background: T.teal100, borderRadius: 20, height: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", background: T.primary, width: `${(step / 3) * 100}%`, borderRadius: 20, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ padding: "28px 28px 40px", animation: "slideUp 0.35s both" }}>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: T.navy, fontWeight: 400, marginBottom: 6 }}>
          {["Vos informations", "Votre rôle", "Sécurisez votre compte"][step - 1]}
        </h2>
        <p style={{ fontSize: 14, color: T.textLight, marginBottom: 28 }}>
          {["Renseignez vos coordonnées.", "Sélectionnez votre profil dans l'application.", "Créez un mot de passe sécurisé."][step - 1]}
        </p>

        {step === 1 && (
          <>
            <Field label="Nom complet" value={form.name} onChange={(v) => set("name", v)} placeholder="Prénom Nom" icon={Icon.User} error={errors.name} autoFocus />
            <Field label="Adresse email" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="vous@gmail.com" icon={Icon.Mail} error={errors.email} />
            <Field label="Téléphone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+212 6XX XXX XXX" icon={Icon.Phone} error={errors.phone} hint="Utilisé pour les alertes urgentes" />
          </>
        )}

        {step === 2 && (
          <>
            {errors.role && <div style={{ fontSize: 13, color: T.danger, background: T.dangerLight, borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>{errors.role}</div>}
            {ROLES.map((r) => (
              <div
                key={r.id}
                onClick={() => set("role", r.id)}
                style={{
                  background: form.role === r.id ? T.teal50 : "white",
                  border: `2px solid ${form.role === r.id ? T.primary : T.teal100}`,
                  borderRadius: 16,
                  padding: "16px 18px",
                  marginBottom: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "all 0.2s",
                  boxShadow: form.role === r.id ? "0 4px 16px rgba(13,148,136,0.15)" : "none",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: form.role === r.id ? T.teal100 : "#f8fafb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: form.role === r.id ? T.primary : T.textLight,
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {r.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.navy }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: T.textLight, marginTop: 3 }}>{r.desc}</div>
                </div>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: form.role === r.id ? T.primary : "transparent",
                    border: `2px solid ${form.role === r.id ? T.primary : T.teal200}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {form.role === r.id && <Icon.Check />}
                </div>
              </div>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Mot de passe" type="password" value={form.pass} onChange={(v) => set("pass", v)} placeholder="Minimum 6 caractères" icon={Icon.Lock} error={errors.pass} autoFocus />
            {form.pass.length > 0 && (
              <div style={{ marginTop: -10, marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 500, color: T.textLight, marginBottom: 6 }}>
                  <span>Sécurité du mot de passe</span>
                  <span style={{ color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strengthLevel ? strengthColor : T.teal100, transition: "background 0.3s" }} />
                  ))}
                </div>
              </div>
            )}
            <Field label="Confirmer le mot de passe" type="password" value={form.confirm} onChange={(v) => set("confirm", v)} placeholder="Répétez le mot de passe" icon={Icon.Lock} error={errors.confirm} />

            <div style={{ background: T.teal50, borderRadius: 14, padding: "16px 18px", border: `1.5px solid ${T.teal100}`, marginBottom: 4 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.navyLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Récapitulatif</p>
              <div style={{ fontSize: 13, color: T.navy, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", gap: 8 }}><span style={{ color: T.textLight, width: 60 }}>Nom</span><span style={{ fontWeight: 600 }}>{formatDisplayName(form.name)}</span></div>
                <div style={{ display: "flex", gap: 8 }}><span style={{ color: T.textLight, width: 60 }}>Email</span><span style={{ fontWeight: 600 }}>{form.email}</span></div>
                <div style={{ display: "flex", gap: 8 }}><span style={{ color: T.textLight, width: 60 }}>Rôle</span><span style={{ fontWeight: 600 }}>{ROLES.find((r) => r.id === form.role)?.label}</span></div>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 24 }}>
          <PrimaryBtn onClick={next} loading={loading} disabled={loading}>
            {!loading && <>{step < 3 ? "Continuer" : "Créer mon compte"} <Icon.ArrowRight /></>}
          </PrimaryBtn>
          {errors.form && <p style={{ marginTop: 10, fontSize: 12, color: T.danger, fontWeight: 600 }}>{errors.form}</p>}
        </div>

        {step === 1 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
              <div style={{ flex: 1, height: 1, background: T.teal100 }} />
              <span style={{ fontSize: 12, color: T.textLight }}>Déjà inscrit ?</span>
              <div style={{ flex: 1, height: 1, background: T.teal100 }} />
            </div>
            <GhostBtn onClick={onLogin}>Se connecter</GhostBtn>
          </>
        )}
      </div>
    </Phone>
  );
}
