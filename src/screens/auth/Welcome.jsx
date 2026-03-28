import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { PrimaryBtn } from "../../components/ui/PrimaryBtn";
import { GhostBtn } from "../../components/ui/GhostBtn";

export default function Welcome({ onLogin, onRegister }) {
  return (
    <Phone>
      <div style={{ background: `linear-gradient(160deg, ${T.primary} 0%, ${T.primaryDark} 100%)`, padding: "72px 28px 56px", borderRadius: "0 0 40px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ animation: "fadeUp 0.5s both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
              <Icon.Logo />
            </div>
            <span style={{ color: "white", fontSize: 18, fontWeight: 600, fontFamily: "'DM Serif Display',serif", letterSpacing: 0.2 }}>CuraFamilia</span>
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 34, color: "white", fontWeight: 400, lineHeight: 1.15, marginBottom: 14 }}>Prenez soin<br /><i>de vos proches</i></h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>Une plateforme complète pour le suivi médicamenteux des personnes âgées.</p>
        </div>
      </div>

      <div style={{ padding: "36px 28px 40px", animation: "slideUp 0.4s 0.2s both" }}>
        <PrimaryBtn onClick={onLogin} style={{ marginBottom: 14 }}>
          Se connecter
        </PrimaryBtn>
        <GhostBtn onClick={onRegister}>
          Créer un compte
        </GhostBtn>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
          <div style={{ flex: 1, height: 1, background: T.teal100 }} />
          <span style={{ fontSize: 12, color: T.textLight, fontWeight: 500 }}>Accès rapide</span>
          <div style={{ flex: 1, height: 1, background: T.teal100 }} />
        </div>

        <button onClick={onLogin} style={{ width: "100%", padding: "14px 24px", background: "white", border: `1.5px solid ${T.teal100}`, borderRadius: 14, fontSize: 14, fontWeight: 500, color: T.textLight, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s" }}>
          <Icon.Shield />
          <span style={{ color: T.navy }}>Interface Senior</span>
        </button>

        <p style={{ textAlign: "center", marginTop: 28, fontSize: 12, color: T.textLight, lineHeight: 1.6 }}>
          En continuant, vous acceptez nos{" "}
          <span style={{ color: T.primary, cursor: "pointer" }}>Conditions d'utilisation</span>
          {" "}et notre{" "}
          <span style={{ color: T.primary, cursor: "pointer" }}>Politique de confidentialité</span>
        </p>
      </div>
    </Phone>
  );
}
