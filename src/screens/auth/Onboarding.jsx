import { useState } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { PrimaryBtn } from "../../components/ui/PrimaryBtn";
import { TextBtn } from "../../components/ui/TextBtn";

const SLIDES = [
  { icon: <Icon.Heart />, title: "Suivi médicamenteux", body: "Programmez les médicaments et horaires de vos proches âgés en quelques secondes." },
  { icon: <Icon.Bell />, title: "Alertes en temps réel", body: "Soyez notifié immédiatement si un médicament n'est pas pris à l'heure prévue." },
  { icon: <Icon.Bot />, title: "Assistant IA intégré", body: "Un chatbot intelligent effectue un bilan de santé quotidien avec vos proches." },
  { icon: <Icon.Users />, title: "Toute la famille connectée", body: "Partagez la surveillance avec tous les membres de votre famille en temps réel." },
];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <Phone>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 24px 0" }}>
        {!isLast && <TextBtn onClick={onDone}>Passer</TextBtn>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px 0", minHeight: 280 }}>
        <div key={step} style={{ width: 160, height: 160, borderRadius: "50%", background: T.teal100, display: "flex", alignItems: "center", justifyContent: "center", color: T.primary, marginBottom: 40, animation: "scaleIn 0.4s cubic-bezier(.34,1.56,.64,1) both" }}>
          {slide.icon}
        </div>
        <h2 key={`t${step}`} style={{ fontFamily: "'DM Serif Display',serif", fontSize: 27, color: T.navy, fontWeight: 400, textAlign: "center", marginBottom: 14, animation: "fadeUp 0.4s both" }}>{slide.title}</h2>
        <p key={`b${step}`} style={{ fontSize: 15, color: T.textLight, lineHeight: 1.7, textAlign: "center", maxWidth: 290, animation: "fadeUp 0.4s 0.05s both" }}>{slide.body}</p>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 390, maxWidth: "100%", padding: "20px 24px 40px", background: T.bg }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ height: 6, borderRadius: 3, background: i === step ? T.primary : T.teal200, width: i === step ? 24 : 6, transition: "all 0.3s" }} />
          ))}
        </div>
        <PrimaryBtn onClick={() => isLast ? onDone() : setStep(p => p + 1)}>
          <span>{isLast ? "Commencer" : "Suivant"}</span>
          <Icon.ArrowRight />
        </PrimaryBtn>
      </div>
    </Phone>
  );
}
