import { useState } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { Field } from "../../components/ui/Field";
import { PrimaryBtn } from "../../components/ui/PrimaryBtn";
import { forgotPasswordAuth } from "../../services/authApi";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.includes("@")) {
      setError("Adresse email invalide");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await forgotPasswordAuth({ email });
      setSent(true);
    } catch (err) {
      setError(err.message || "Impossible d'envoyer le lien.");
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

      <div style={{ padding: "36px 28px 40px", animation: "slideUp 0.4s both" }}>
        {!sent ? (
          <>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: T.teal100, display: "flex", alignItems: "center", justifyContent: "center", color: T.primary, marginBottom: 24 }}>
              <Icon.Lock />
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: T.navy, fontWeight: 400, marginBottom: 8 }}>Mot de passe oublié</h2>
            <p style={{ fontSize: 14, color: T.textLight, marginBottom: 32, lineHeight: 1.7 }}>Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
            <Field label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="vous@gmail.com" icon={Icon.Mail} error={error} autoFocus />
            <PrimaryBtn onClick={submit} loading={loading} disabled={loading}>
              {!loading && <>Envoyer le lien <Icon.ArrowRight /></>}
            </PrimaryBtn>
          </>
        ) : (
          <div style={{ textAlign: "center", paddingTop: 40, animation: "scaleIn 0.5s both" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: T.successLight, display: "flex", alignItems: "center", justifyContent: "center", color: T.success, margin: "0 auto 28px" }}>
              <Icon.Check />
            </div>
            <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: T.navy, fontWeight: 400, marginBottom: 12 }}>Email envoyé</h3>
            <p style={{ color: T.textLight, fontSize: 14, lineHeight: 1.7, marginBottom: 36 }}>
              Consultez votre boîte mail à l'adresse
              <br />
              <span style={{ color: T.navy, fontWeight: 600 }}>{email}</span>
              <br />
              et suivez les instructions.
            </p>
            <PrimaryBtn onClick={onBack}>Retour à la connexion</PrimaryBtn>
          </div>
        )}
      </div>
    </Phone>
  );
}
