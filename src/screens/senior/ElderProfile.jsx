import { useState, useEffect } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { BottomNav } from "../../components/senior/BottomNav";

const PAGE_TITLE_FONT = "'DM Serif Display', serif";

function SectionCard({ title, subtitle, icon, children, delay = 0 }) {
  return (
    <div
      style={{
        animation: `fadeUp .42s ${delay}s both`,
        background: "white",
        borderRadius: 22,
        padding: 16,
        border: `1.5px solid ${T.teal100}`,
        boxShadow: "0 8px 20px rgba(10,124,113,0.06)",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            background: T.teal50,
            color: T.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: T.navy }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

function InfoRow({ label, value, danger = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        padding: "11px 0",
        borderBottom: `1px solid ${T.teal50}`,
      }}
    >
      <span style={{ fontSize: 13, color: T.textLight, fontWeight: 700 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          color: danger ? T.danger : T.navy,
          fontWeight: 800,
          textAlign: "right",
          lineHeight: 1.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Tag({ children, tone = "default" }) {
  const tones = {
    default: { bg: T.teal50, color: T.primaryDark },
    success: { bg: T.successLight, color: T.success },
    warning: { bg: T.warningLight, color: T.warning },
    danger: { bg: T.dangerLight, color: T.danger },
  };

  return (
    <span
      style={{
        padding: "7px 11px",
        borderRadius: 999,
        background: tones[tone].bg,
        color: tones[tone].color,
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

export default function ElderProfile({ user, onNavigate = () => {} }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [audioReminders, setAudioReminders] = useState(true);

  // Helper properties from the backend or fallback
  const p = profile || {};
  const userName = user?.name || "Senior App";
  
  // Compute age from date of birth
  let ageString = "";
  if (p.dateOfBirth) {
    const calcAge = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
    ageString = `${calcAge} ans`;
  }

  // Effect to load data
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) {
        setError("Session invalide.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // homeApi is dynamically imported here to avoid top-level require cycles if any 
        // (assuming src/services/homeApi matches this path)
        const { getSeniorProfile, parseSeniorIdFromUser } = await import("../../services/homeApi");
        const parsedId = parseSeniorIdFromUser(user);
        if (!parsedId) {
          throw new Error("ID senior invalide.");
        }
        const res = await getSeniorProfile({ seniorId: parsedId });
        setProfile(res);
        if (res?.audioRemindersEnabled !== undefined) {
          setAudioReminders(res.audioRemindersEnabled);
        }
      } catch (err) {
        console.error("Erreur chargement profil:", err);
        setError("Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user?.id]);

  return (
    <Phone>
      <div style={{ padding: "18px 18px 110px", color: T.navy }}>
        {/* Header */}
        <div style={{ animation: "fadeUp .42s both", marginBottom: 16 }}>
          <button
            onClick={() => onNavigate("dashboard")}
            style={{
              border: "none",
              background: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: T.textLight,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 14,
            }}
          >
            <Icon.ArrowLeft />
            Retour
          </button>

          <h1
            style={{
              fontFamily: PAGE_TITLE_FONT,
              fontSize: 28,
              lineHeight: 1.15,
              fontWeight: 400,
              letterSpacing: -0.5,
              marginBottom: 6,
            }}
          >
            Profil
          </h1>

          <p style={{ color: T.textLight, fontSize: 14, lineHeight: 1.6 }}>
            {"Informations personnelles, m\u00E9dicales et contacts importants."}
          </p>
          {loading && (
            <p style={{ color: T.primary, fontSize: 13, lineHeight: 1.4, marginTop: 8 }}>
              Chargement du profil...
            </p>
          )}
          {!loading && error && (
            <p style={{ color: T.danger, fontSize: 13, lineHeight: 1.4, marginTop: 8 }}>
              {error}
            </p>
          )}
        </div>

        {/* Identity Card */}
        <div
          style={{
            animation: "fadeUp .42s .04s both",
            background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
            color: "white",
            borderRadius: 26,
            padding: 20,
            boxShadow: "0 16px 34px rgba(13,148,136,0.24)",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 22,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              {userName.substring(0, 2).toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: PAGE_TITLE_FONT, fontSize: 22, fontWeight: 400, lineHeight: 1.1 }}>
                M(me) {userName}
              </div>
              <div style={{ fontSize: 14, opacity: 0.88, marginTop: 5 }}>
                {ageString ? `${ageString} \u00B7 ` : ""}Profil senior
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <Tag>Suivi actif</Tag>
                <Tag>{"Famille connect\u00E9e"}</Tag>
              </div>
            </div>
          </div>
        </div>

        {/* Identite */}
        <SectionCard
          title={"Identit\u00E9"}
          subtitle="Informations personnelles essentielles"
          icon={<Icon.User active />}
          delay={0.08}
        >
          <InfoRow label="Nom complet" value={userName} />
          {ageString && <InfoRow label={"\u00C2ge"} value={ageString} />}
          <InfoRow label="Date de naissance" value={p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("fr-FR") : "Non renseign\u00E9"} />
          <InfoRow label={"T\u00E9l\u00E9phone"} value={user?.phone || "Non renseign\u00E9"} />
          <InfoRow label="Ville" value={p.city || "Non renseign\u00E9"} />
        </SectionCard>

        {/* Dossier medical */}
        <SectionCard
          title={"Dossier m\u00E9dical"}
          subtitle={"R\u00E9sum\u00E9 sant\u00E9 pour le suivi quotidien"}
          icon={<Icon.Heart />}
          delay={0.12}
        >
          <InfoRow label="Maladies chroniques" value={p.chronicDiseases || "Aucune"} />
          <InfoRow label="Groupe sanguin" value={p.bloodType || "INCONNU"} />
          <InfoRow label="Allergies" value={p.allergies || "Aucune connue"} />
          <InfoRow label={"M\u00E9decin traitant"} value={p.mainDoctorName || "Non d\u00E9fini"} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <Tag success>Traitements suivis</Tag>
            <Tag>Rappels actifs</Tag>
          </div>
        </SectionCard>

        {/* Famille & urgence */}
        <SectionCard
          title="Famille & urgence"
          subtitle="Contacts prioritaires et informations sensibles"
          icon={<Icon.Alert />}
          delay={0.16}
        >
          <InfoRow label="Contact principal" value={p.emergencyContactName || "Non d\u00E9fini"} />
          <InfoRow label="Lien" value={p.emergencyContactRelation || "-"} />
          <InfoRow label={"T\u00E9l\u00E9phone"} value={p.emergencyContactPhone || "Num\u00E9ro non fourni"} />
          <InfoRow label={"Num\u00E9ro d'urgence"} value="15 / 112" danger />
          {p.specialNote && (
            <InfoRow
              label={"Note sp\u00E9ciale"}
              value={p.specialNote}
            />
          )}
        </SectionCard>

        {/* Preferences */}
        <SectionCard
          title={"Pr\u00E9f\u00E9rences"}
          subtitle={"R\u00E9glages simples pour le confort du senior"}
          icon={<Icon.BellSmall />}
          delay={0.2}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 0 10px",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.navy }}>
                Rappels audio
              </div>
              <div style={{ fontSize: 12, color: T.textLight, marginTop: 3 }}>
                {"Lecture vocale des m\u00E9dicaments et notifications"}
              </div>
            </div>

            <button
              onClick={() => setAudioReminders(!audioReminders)}
              style={{
                width: 58,
                height: 32,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: audioReminders ? T.primary : T.teal100,
                position: "relative",
                transition: "all .2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  left: audioReminders ? 30 : 4,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "white",
                  transition: "all .2s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              />
            </button>
          </div>

          <InfoRow label="Langue" value={p.preferredLanguage === "ar" ? "Arabe" : "Fran\u00E7ais"} />
          <InfoRow label="Taille du texte" value={p.textSize === "small" ? "Petite" : p.textSize === "medium" ? "Moyenne" : "Grande"} />
          <InfoRow label="Notifications" value={p.notificationsEnabled !== false ? "Activ\u00E9es" : "D\u00E9sactiv\u00E9es"} />
        </SectionCard>

        {/* Safety card */}
        <div
          style={{
            animation: "fadeUp .42s .24s both",
            background: "linear-gradient(180deg, #e7fbf7 0%, #ddf7f1 100%)",
            border: `1.5px solid rgba(94,234,212,0.45)`,
            borderRadius: 30,
            padding: "20px 18px",
            marginBottom: 18,
            boxShadow: "0 18px 34px rgba(13,148,136,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: "white",
                color: T.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulseSoft 1.8s ease infinite",
                boxShadow: "0 10px 24px rgba(13,148,136,0.08)",
                flexShrink: 0,
              }}
            >
              <Icon.ShieldSmall />
            </div>

            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  color: T.primaryDark,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {"S\u00E9curit\u00E9 prioritaire"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: T.navyLight,
                  marginTop: 6,
                  lineHeight: 1.45,
                  maxWidth: 250,
                }}
              >
                {"Les contacts d'urgence sont enregistr\u00E9s et pr\u00EAts \u00E0 \u00EAtre utilis\u00E9s."}
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            try {
              localStorage.removeItem("cura_auth_token");
              localStorage.removeItem("cura_auth_user");
            } catch (_error) {
              // Ignore storage errors.
            }
            window.location.reload();
          }}
          style={{
            animation: "fadeUp .42s .28s both",
            width: "100%",
            border: "none",
            borderRadius: 28,
            padding: "20px 20px",
            background: "rgba(255,255,255,0.78)",
            color: "#98a3af",
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            boxShadow: "0 10px 24px rgba(148,163,184,0.08)",
            letterSpacing: "-0.02em",
          }}
        >
          {"Se d\u00E9connecter"}
        </button>
      </div>

      <BottomNav current="profile" onNavigate={onNavigate} />
    </Phone>
  );
}

