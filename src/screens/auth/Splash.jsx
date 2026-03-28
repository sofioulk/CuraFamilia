import { useEffect } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";

export default function Splash({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <Phone bg={`linear-gradient(160deg, ${T.primaryDark} 0%, #064e3b 100%)`}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ animation: "scaleIn 0.7s cubic-bezier(.34,1.56,.64,1) both" }}>
          <div style={{ width: 88, height: 88, borderRadius: 28, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}>
            <Icon.Logo fill="white" />
          </div>
        </div>
        <div style={{ textAlign: "center", animation: "fadeUp 0.6s 0.3s both" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "white", fontWeight: 400, letterSpacing: -0.5 }}>CuraFamilia</h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 8, fontWeight: 400 }}>Suivi médicamenteux intelligent</p>
        </div>
        <div style={{ display: "flex", gap: 6, animation: "fadeUp 0.6s 0.6s both" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.5)", animation: `pulse 1.2s ${i * 0.2}s ease infinite` }} />
          ))}
        </div>
      </div>
    </Phone>
  );
}
