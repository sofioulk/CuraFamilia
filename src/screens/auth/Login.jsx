import { useState } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { Field } from "../../components/ui/Field";
import { PrimaryBtn } from "../../components/ui/PrimaryBtn";
import { TextBtn } from "../../components/ui/TextBtn";
import { GhostBtn } from "../../components/ui/GhostBtn";
import { loginAuth } from "../../services/authApi";

export default function Login({ onBack, onSuccess, onRegister, onForgot }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(false);

  const validate = () => {
    const e = {};
    if (!email.trim() || !email.includes("@")) e.email = "Adresse email invalide";
    if (pass.length < 6) e.pass = "Minimum 6 caractères requis";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const result = await loginAuth({ email, password: pass });
      onSuccess(result);
    } catch (err) {
      setErrors({ form: err.message || "Connexion impossible." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Phone>
      <div style={{ padding: "20px 28px 0" }}>
        <button
          onClick={onBack}
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
      </div>

      <div style={{ padding: "32px 28px 20px" }}>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 30, color: T.navy, fontWeight: 400, marginBottom: 6 }}>Connexion</h2>
        <p style={{ fontSize: 14, color: T.textLight, marginBottom: 36, lineHeight: 1.6 }}>Renseignez vos identifiants pour accéder à votre espace.</p>

        <div style={shake ? { animation: "shake 0.4s" } : {}}>
          <Field label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="exemple@gmail.com" icon={Icon.Mail} error={errors.email} autoFocus />
          <Field label="Mot de passe" type="password" value={pass} onChange={setPass} placeholder="Votre mot de passe" icon={Icon.Lock} error={errors.pass} />
        </div>

        <div style={{ textAlign: "right", marginBottom: 28, marginTop: -8 }}>
          <TextBtn onClick={onForgot} style={{ width: "auto", display: "inline-flex", textDecoration: "underline", textUnderlineOffset: 3 }}>
            Mot de passe oublié ?
          </TextBtn>

        </div>

        <PrimaryBtn onClick={submit} loading={loading} disabled={loading}>
          {!loading && <>Se connecter <Icon.ArrowRight /></>}
        </PrimaryBtn>
        {errors.form && <p style={{ marginTop: 10, fontSize: 12, color: T.danger, fontWeight: 600 }}>{errors.form}</p>}

        <div style={{ marginTop: 20, background: T.teal50, borderRadius: 14, padding: "14px 18px", border: `1.5px dashed ${T.teal200}` }}>
          <>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.navyLight, marginBottom: 6 }}>Backend actif</p>
            <p style={{ fontSize: 12, color: T.textLight, marginBottom: 0 }}>
              Connectez-vous avec un compte créé depuis l'écran d'inscription.
            </p>

          </>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: T.teal100 }} />
          <span style={{ fontSize: 12, color: T.textLight }}>Pas encore de compte ?</span>
          <div style={{ flex: 1, height: 1, background: T.teal100 }} />
        </div>

        <GhostBtn onClick={onRegister}>Créer un compte</GhostBtn>
      </div>
    </Phone>
  );
}
