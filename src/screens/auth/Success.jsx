import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { PrimaryBtn } from "../../components/ui/PrimaryBtn";
import { formatDisplayFirstName } from "../../utils/nameFormat";

export default function Success({ user, onContinue }) {
  return (
    <Phone bg={`linear-gradient(160deg, ${T.primary}, ${T.primaryDark})`}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", marginBottom: 28, animation: "scaleIn 0.6s cubic-bezier(.34,1.56,.64,1) both" }}>
          <Icon.Check />
        </div>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, color: "white", fontWeight: 400, marginBottom: 10, animation: "fadeUp 0.5s 0.2s both" }}>
          Bienvenue, {formatDisplayFirstName(user?.name, "ami(e)")}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 400, marginBottom: 8, animation: "fadeUp 0.5s 0.3s both" }}>
          Votre compte a été créé avec succès.
        </p>

        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 52, animation: "fadeUp 0.5s 0.4s both" }}>{user?.email}</p>

        <div style={{ width: "100%", animation: "fadeUp 0.5s 0.5s both" }}>
          <PrimaryBtn onClick={onContinue} style={{ background: "white", color: T.primary, boxShadow: "0 6px 24px rgba(0,0,0,0.15)", animation: "none" }}>
            Accéder à l'application <Icon.ArrowRight />
          </PrimaryBtn>

        </div>
      </div>
    </Phone>
  );
}
