import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { getEffectiveFamilyUser, resolveFamilySeniorId } from "./familyUtils";
import { generateLinkCode } from "../../services/homeApi";

const PAGE_BODY_FONT = "'DM Sans', sans-serif";
const PAGE_TITLE_FONT = "'DM Serif Display', serif";
const SETTINGS_STORAGE_KEY = "cura_family_settings";

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 12, color: T.textLight, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
        {title}
      </h3>
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1.5px solid ${T.teal100}`,
          boxShadow: "0 8px 18px rgba(10,124,113,0.06)",
          padding: "0 12px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, icon: RowIcon, danger = false, noBorder = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "12px 0",
        borderBottom: noBorder ? "none" : "1px solid #EAF5F2",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!!RowIcon && <span style={{ color: danger ? T.danger : T.textLight }}><RowIcon /></span>}
        <span style={{ fontSize: 14, color: danger ? T.danger : T.navy, fontWeight: 700 }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, color: T.textLight, fontWeight: 700, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onChange, noBorder = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "12px 0",
        borderBottom: noBorder ? "none" : "1px solid #EAF5F2",
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: T.navy, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        style={{
          width: 54,
          height: 30,
          borderRadius: 999,
          border: "none",
          background: enabled ? T.primary : T.teal100,
          position: "relative",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 27 : 3,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            transition: "all .2s ease",
          }}
        />
      </button>
    </div>
  );
}

function formatExpiry(expiresAt) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function FamilySettings({ user, onNavigate = () => {} }) {
  const effectiveUser = useMemo(() => getEffectiveFamilyUser(user), [user]);
  const seniorId = useMemo(() => resolveFamilySeniorId(effectiveUser), [effectiveUser]);

  const [smsAlerts, setSmsAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [linkCode, setLinkCode] = useState(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.smsAlerts === "boolean") setSmsAlerts(parsed.smsAlerts);
      if (typeof parsed?.weeklyReport === "boolean") setWeeklyReport(parsed.weeklyReport);
    } catch (_error) {
      // Ignore malformed local settings and keep defaults.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ smsAlerts, weeklyReport })
      );
    } catch (_error) {
      // Ignore storage errors silently for settings.
    }
  }, [smsAlerts, weeklyReport]);

  const fetchLinkCode = useCallback(async () => {
    setLinkLoading(true);
    setLinkError("");
    try {
      const data = await generateLinkCode({ seniorId });
      setLinkCode(data.code);
      setLinkExpiresAt(data.expiresAt || null);
    } catch (err) {
      setLinkError(String(err?.message || "Erreur lors de la generation du code."));
    } finally {
      setLinkLoading(false);
    }
  }, [seniorId]);

  useEffect(() => {
    fetchLinkCode();
  }, [fetchLinkCode]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("cura_auth_token");
      localStorage.removeItem("cura_auth_user");
    } catch (_error) {
      // Ignore storage issues during logout cleanup.
    }
    window.location.reload();
  };

  return (
    <Phone>
      <div style={{ fontFamily: PAGE_BODY_FONT }}>
        <div style={{ minHeight: "100vh", padding: "16px 16px 110px", color: T.navy }}>
          <div style={{ animation: "fadeUp .45s both", marginBottom: 14 }}>
            <h1 style={{ fontFamily: PAGE_TITLE_FONT, fontSize: 28, fontWeight: 400, lineHeight: 1.1, marginBottom: 8 }}>
              Reglages
            </h1>
            <p style={{ color: T.textLight, fontSize: 14, lineHeight: 1.6 }}>
              Configuration compte famille, liaison senior et securite.
            </p>
          </div>

          <div
            style={{
              animation: "fadeUp .45s .05s both",
              background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
              color: "white",
              borderRadius: 22,
              padding: 16,
              marginBottom: 14,
              boxShadow: "0 16px 34px rgba(13,148,136,0.24)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.84, fontWeight: 800, marginBottom: 6 }}>Code de liaison</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <strong style={{ fontSize: 28, letterSpacing: 4, opacity: linkLoading ? 0.4 : 1 }}>
                {linkLoading ? "······" : linkError ? "——" : (linkCode || "——")}
              </strong>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "6px 8px",
                    borderRadius: 999,
                    background: seniorId ? "rgba(22,163,74,0.35)" : "rgba(251,146,60,0.35)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {seniorId ? "Senior relie" : "En attente de liaison"}
                </span>
                {linkExpiresAt && !linkError && (
                  <span style={{ fontSize: 10, opacity: 0.7 }}>Expire le {formatExpiry(linkExpiresAt)}</span>
                )}
              </div>
            </div>
            {linkError && (
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>{linkError}</div>
            )}
            <button
              onClick={fetchLinkCode}
              disabled={linkLoading}
              style={{
                marginTop: 10,
                background: "rgba(255,255,255,0.18)",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontSize: 12,
                fontWeight: 800,
                padding: "6px 12px",
                cursor: linkLoading ? "default" : "pointer",
                opacity: linkLoading ? 0.5 : 1,
              }}
            >
              {linkLoading ? "Generation..." : "Nouveau code"}
            </button>
          </div>

          <Section title="Compte">
            <Row icon={Icon.User} label="Nom" value={effectiveUser?.name || "Non renseigne"} />
            <Row icon={Icon.Mail} label="Email" value={effectiveUser?.email || "Non renseigne"} noBorder />
          </Section>

          <Section title="Suivi">
            <ToggleRow
              label="Alertes SOS par SMS"
              description="Recevoir un SMS immediat en cas d'alerte."
              enabled={smsAlerts}
              onChange={setSmsAlerts}
            />
            <ToggleRow
              label="Rapport hebdo"
              description="Resume hebdomadaire des prises et check-ins."
              enabled={weeklyReport}
              onChange={setWeeklyReport}
              noBorder
            />
          </Section>

          <Section title="Navigation">
            <Row icon={Icon.LayoutDashboard} label="Retour au tableau famille" value="Ouvrir" />
            <button
              onClick={() => onNavigate("family_dashboard")}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 12,
                background: "#F0FDFA",
                color: T.primaryDark,
                fontSize: 13,
                fontWeight: 800,
                padding: "9px 10px",
                marginBottom: 12,
                cursor: "pointer",
              }}
            >
              Ouvrir le tableau de bord
            </button>
          </Section>

          <Section title="Securite">
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                color: T.danger,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 800,
                padding: "12px 0",
                cursor: "pointer",
              }}
            >
              <Icon.LogOut />
              Deconnexion
            </button>
          </Section>
        </div>

        <FamilyBottomNav activeTab="family_settings" onNavigate={onNavigate} />
      </div>
    </Phone>
  );
}
