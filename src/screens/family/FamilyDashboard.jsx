import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import {
  acknowledgeSosAlert,
  getFamilyDashboard,
  getSeniorHome,
  getSosHistory,
  resolveSosAlert,
} from "../../services/homeApi";
import {
  formatFamilyDate,
  formatFamilyDateTime,
  formatFamilyTime,
  getEffectiveFamilyUser,
  getFamilyFirstName,
  useFamilySeniorId,
} from "./familyUtils";

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

const BODY = "'DM Sans', sans-serif";
const SERIF = "'DM Serif Display', serif";
const FR_DAYS = ["D", "L", "M", "M", "J", "V", "S"];

/* ─────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────── */

function clamp(v, lo = 0, hi = 100) {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function parseTs(value, fallback = Date.now()) {
  if (!value) return fallback;
  const s = String(value).trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(":");
    const d = new Date();
    d.setHours(+h, +m, 0, 0);
    return d.getTime();
  }
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? fallback : t;
}

function minutesDiff(value) {
  if (!value) return null;
  const t = parseTs(value, NaN);
  return Number.isFinite(t) ? Math.round((t - Date.now()) / 60000) : null;
}

function relTime(value) {
  const d = minutesDiff(value);
  if (d == null) return "--";
  if (Math.abs(d) < 1) return "Maintenant";
  if (d > 0 && d < 60) return `Dans ${d} min`;
  if (d > 0) return `Dans ${Math.ceil(d / 60)} h`;
  const p = Math.abs(d);
  return p < 60 ? `Il y a ${p} min` : `Il y a ${Math.ceil(p / 60)} h`;
}

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bonjour";
  if (h >= 12 && h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function nowLabel() {
  const n = new Date();
  const d = n.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const t = n.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${d.charAt(0).toUpperCase()}${d.slice(1)} · ${t}`;
}

function getMoodColor(label, score) {
  if (label) {
    const l = label.toLowerCase();
    if (l.includes("bien") || l.includes("bon")) return T.success;
    if (l.includes("moyen")) return T.warning;
    if (l.includes("difficile") || l.includes("mal")) return T.danger;
  }
  if (score != null) {
    const s = score > 1 ? score : score * 3;
    if (s <= 1.5) return T.success;
    if (s <= 2.5) return T.warning;
    return T.danger;
  }
  return "#CBD5E1";
}

function getMoodEmoji(label) {
  if (!label) return "—";
  const l = label.toLowerCase();
  if (l.includes("bien") || l.includes("bon")) return "😊";
  if (l.includes("moyen")) return "😐";
  return "😔";
}

function scoreColor(s) {
  if (s >= 75) return T.success;
  if (s >= 50) return T.warning;
  return T.danger;
}

function isActiveSosStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "triggered" || normalized === "acknowledged";
}

function deriveActiveSosStatus(alerts, fallbackStatus = null) {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return isActiveSosStatus(fallbackStatus) ? String(fallbackStatus).toLowerCase() : null;
  }

  if (alerts.some((alert) => String(alert?.status || "").toLowerCase() === "triggered")) {
    return "triggered";
  }

  if (alerts.some((alert) => String(alert?.status || "").toLowerCase() === "acknowledged")) {
    return "acknowledged";
  }

  return null;
}

function notificationStorageKey(seniorId) {
  return seniorId
    ? `curafamilia.family.notifications.${seniorId}`
    : "curafamilia.family.notifications";
}

function notificationTimestamp(value) {
  const ts = parseTs(value, NaN);
  return Number.isFinite(ts) ? ts : Date.now();
}

function appointmentNotificationTitle(value) {
  const ts = parseTs(value, NaN);
  if (!Number.isFinite(ts)) return "Rendez-vous a venir";

  const target = new Date(ts);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();

  if (sameDay(target, now)) return "Rendez-vous aujourd'hui";
  if (sameDay(target, tomorrow)) return "Rendez-vous demain";
  return "Rendez-vous a venir";
}

// Evaluate tone from raw checkin answer text (fallback when dashboard API is unavailable)
function checkinTone(answer) {
  const n = String(answer || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!n) return { label: "Aucun", mood: null, color: "#94A3B8" };
  if (n.includes("bien") || n.includes("oui") || n.includes("bon"))
    return { label: "Bien", mood: "good", color: T.success };
  if (n.includes("moyen") || n.includes("fatigue"))
    return { label: "Moyen", mood: "mid", color: T.warning };
  if (n.includes("non") || n.includes("mal") || n.includes("douleur"))
    return { label: "Difficile", mood: "hard", color: T.danger };
  return { label: "Neutre", mood: "mid", color: T.primaryDark };
}

function computePriority({ activeSos, pendingMeds, nextMedAt, nextApptAt }) {
  if (activeSos)
    return {
      level: "critical",
      title: "SOS actif",
      text: "Contactez votre proche immédiatement.",
      cta: "Voir alertes",
      route: "family_dashboard",
    };
  const medD = minutesDiff(nextMedAt);
  if (pendingMeds > 0 && medD != null && medD <= 90)
    return {
      level: "attention",
      title: "Prise proche",
      text: `Médication prévue ${relTime(nextMedAt).toLowerCase()}.`,
      cta: "Voir traitements",
      route: "family_health",
    };
  const apptD = minutesDiff(nextApptAt);
  if (apptD != null && apptD > 0 && apptD <= 24 * 60)
    return {
      level: "attention",
      title: "Rendez-vous aujourd'hui",
      text: `Consultation ${relTime(nextApptAt).toLowerCase()}.`,
      cta: "Voir agenda",
      route: "family_calendar",
    };
  return {
    level: "stable",
    title: "Situation stable",
    text: "Aucun signal critique détecté.",
    cta: "Vérifier les soins",
    route: "family_health",
  };
}

function prioritySkin(level) {
  if (level === "critical")
    return {
      chipBg: "#FEE2E2", chipColor: "#B91C1C",
      glow: "rgba(239,68,68,0.34)", ring: "#FCA5A5",
      grad: "linear-gradient(148deg, #0F766E 0%, #134E4A 56%, #0B3B39 100%)",
    };
  if (level === "attention")
    return {
      chipBg: "#FFEDD5", chipColor: "#C2410C",
      glow: "rgba(249,115,22,0.25)", ring: "#FDBA74",
      grad: "linear-gradient(148deg, #0E8D82 0%, #0C6D66 56%, #0A5250 100%)",
    };
  return {
    chipBg: "#DCFCE7", chipColor: "#166534",
    glow: "rgba(34,197,94,0.22)", ring: "#86EFAC",
    grad: "linear-gradient(148deg, #0D9488 0%, #0A7C71 56%, #085C55 100%)",
  };
}

function timelineMeta(type) {
  const t = String(type || "").toLowerCase();
  if (t === "medication:taken") return { color: T.success, icon: "💊" };
  if (t.startsWith("medication:")) return { color: "#3B82F6", icon: "💊" };
  if (t.startsWith("appointment:")) return { color: "#8B5CF6", icon: "📅" };
  if (t === "sos:triggered") return { color: T.danger, icon: "🆘" };
  if (t === "sos:acknowledged") return { color: T.warning, icon: "🔔" };
  if (t === "sos:resolved") return { color: T.success, icon: "✅" };
  if (t.startsWith("checkin:")) return { color: T.primary, icon: "💬" };
  return { color: "#94A3B8", icon: "•" };
}

function getMoodBarProps(label, score) {
  const l = (label || "").toLowerCase();
  if (l.includes("bien") || l.includes("bon")) return { h: 95, color: T.success };
  if (l.includes("difficile") || l.includes("mal")) return { h: 30, color: T.danger };
  if (l.includes("moyen")) return { h: 62, color: T.warning };
  if (score != null) {
    const s = score > 1 ? score : score * 3;
    if (s <= 1.5) return { h: 95, color: T.success };
    if (s <= 2.5) return { h: 62, color: T.warning };
    return { h: 30, color: T.danger };
  }
  return { h: 0, color: "#E2E8F0" };
}

/* ─────────────────────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────────────────────── */

const SHIMMER_STYLE = {
  background: "linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.2s infinite",
};

function Bone({ w = "100%", h, r = 8, style }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, ...SHIMMER_STYLE, flexShrink: 0, ...style }} />
  );
}

function NotificationChip({ tone = "neutral", children }) {
  const skins = {
    critical: { background: "#FEE2E2", color: "#B91C1C" },
    attention: { background: "#FFEDD5", color: "#C2410C" },
    info: { background: "#EFF6FF", color: "#1D4ED8" },
    primary: { background: "#ECFEFF", color: "#0F766E" },
    success: { background: "#ECFDF5", color: "#047857" },
    neutral: { background: "#F1F5F9", color: "#475569" },
  };
  const skin = skins[tone] || skins.neutral;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 26,
      padding: "0 10px",
      borderRadius: 999,
      background: skin.background,
      color: skin.color,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function NotificationIcon({ kind, status }) {
  if (kind === "sos") {
    const isTriggered = status === "triggered";
    return (
      <span style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        background: isTriggered
          ? "linear-gradient(180deg,#FEE2E2 0%,#FECACA 100%)"
          : "linear-gradient(180deg,#FFEDD5 0%,#FED7AA 100%)",
        color: isTriggered ? "#B91C1C" : "#C2410C",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        boxShadow: isTriggered
          ? "0 10px 24px rgba(239,68,68,0.16)"
          : "0 10px 24px rgba(249,115,22,0.14)",
      }}>
        <Icon.Siren />
      </span>
    );
  }

  if (kind === "medication") {
    return (
      <span style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        background: "linear-gradient(180deg,#ECFEFF 0%,#CCFBF1 100%)",
        color: "#0F766E",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        boxShadow: "0 10px 24px rgba(13,148,136,0.12)",
      }}>
        <Icon.Pill active />
      </span>
    );
  }

  return (
    <span style={{
      width: 42,
      height: 42,
      borderRadius: 14,
      background: "linear-gradient(180deg,#F0F9FF 0%,#DBEAFE 100%)",
      color: "#0369A1",
      display: "grid",
      placeItems: "center",
      flexShrink: 0,
      boxShadow: "0 10px 24px rgba(59,130,246,0.12)",
    }}>
      <Icon.Calendar />
    </span>
  );
}

function NotificationRow({ item, unread, onSelectItem }) {
  return (
    <button
      type="button"
      onClick={() => onSelectItem(item)}
      style={{
        width: "100%",
        border: unread
          ? "1px solid rgba(13,148,136,0.18)"
          : "1px solid rgba(15,23,42,0.06)",
        borderRadius: 20,
        background: unread
          ? "linear-gradient(180deg,#FFFFFF 0%,#F7FFFD 100%)"
          : "#FFFFFF",
        boxShadow: unread
          ? "0 16px 34px rgba(13,148,136,0.10)"
          : "0 10px 26px rgba(15,23,42,0.05)",
        padding: "14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <NotificationIcon kind={item.kind} status={item.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14.5, color: "var(--ink)", lineHeight: 1.35 }}>
                {item.title}
              </strong>
              {unread && (
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: item.accentColor || "#0D9488",
                  boxShadow: "0 0 0 4px rgba(13,148,136,0.12)",
                }} />
              )}
            </div>
            <p style={{ marginTop: 5, fontSize: 12.5, color: "var(--soft)", lineHeight: 1.55 }}>
              {item.body}
            </p>
          </div>
          <span style={{
            fontSize: 11,
            color: "var(--muted)",
            fontWeight: 800,
            whiteSpace: "nowrap",
            paddingTop: 2,
          }}>
            {item.timeLabel}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          <NotificationChip tone={item.badgeTone}>{item.badgeLabel}</NotificationChip>
          {item.sourceLabel ? (
            <NotificationChip tone="neutral">{item.sourceLabel}</NotificationChip>
          ) : null}
        </div>

        <div style={{
          marginTop: 11,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: item.accentColor || T.primary,
          fontSize: 12.5,
          fontWeight: 800,
        }}>
          {item.ctaLabel || "Ouvrir"}
          <Icon.ArrowRight />
        </div>
      </div>
    </button>
  );
}

function NotificationsSheet({ open, onClose, items, unreadIds, onSelectItem, onMarkAllRead }) {
  if (!open) return null;

  const unreadSet = new Set(unreadIds);
  const unreadItems = items.filter((item) => unreadSet.has(item.signature));
  const seenItems = items.filter((item) => !unreadSet.has(item.signature));
  const urgentCount = items.filter((item) => item.severity === "critical").length;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          left: "50%",
          width: "min(390px, 100vw)",
          transform: "translateX(-50%)",
          background: "rgba(15,23,42,0.28)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 180,
          animation: "fadeIn .18s",
        }}
      />

      <div style={{
        position: "fixed",
        inset: 0,
        left: "50%",
        width: "min(390px, 100vw)",
        transform: "translateX(-50%)",
        zIndex: 181,
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, rgba(243,251,248,0.98) 0%, rgba(248,252,251,0.98) 180px, rgba(255,255,255,0.99) 100%)",
        animation: "fadeIn .22s",
      }}>
        <div style={{
          padding: "16px 16px 14px",
          borderBottom: "1px solid rgba(15,23,42,0.06)",
          background: "rgba(248,252,251,0.92)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 28,
                padding: "0 10px",
                borderRadius: 999,
                background: "rgba(13,148,136,0.10)",
                color: "#0F766E",
                fontSize: 11,
                fontWeight: 800,
              }}>
                <Icon.BellSmall />
                Centre
              </span>
              <h3 style={{
                marginTop: 12,
                fontFamily: SERIF,
                fontSize: 27,
                lineHeight: 1,
                fontWeight: 400,
                color: "#0D3B39",
              }}>
                Notifications
              </h3>
              <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: "var(--soft)", maxWidth: 280 }}>
                Retrouvez ici les alertes importantes, les traitements a verifier et les rendez-vous proches.
              </p>
            </div>

            <button
              type="button"
              aria-label="Fermer les notifications"
              onClick={onClose}
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,0.06)",
                background: "#FFFFFF",
                color: "#0D3B39",
                fontSize: 22,
                lineHeight: 1,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
            {[
              { label: "Actives", value: items.length, tone: "primary" },
              { label: "Urgentes", value: urgentCount, tone: "critical" },
              { label: "Non lues", value: unreadItems.length, tone: unreadItems.length ? "attention" : "neutral" },
            ].map((stat) => (
              <div key={stat.label} style={{
                borderRadius: 16,
                padding: "11px 12px",
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.05)",
                boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
              }}>
                <div style={{ fontSize: 19, fontWeight: 900, color: "var(--ink)" }}>{stat.value}</div>
                <div style={{ marginTop: 2 }}>
                  <NotificationChip tone={stat.tone}>{stat.label}</NotificationChip>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12 }}>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
              Les alertes restent visibles ici tant que la situation n'est pas reglee.
            </p>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={!unreadItems.length}
              style={{
                border: "none",
                borderRadius: 12,
                background: unreadItems.length ? "#0D9488" : "#E2E8F0",
                color: unreadItems.length ? "#FFFFFF" : "#94A3B8",
                padding: "10px 12px",
                fontSize: 11.5,
                fontWeight: 800,
                cursor: unreadItems.length ? "pointer" : "default",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <Icon.Check />
              Tout lire
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 112px" }}>
          {!items.length ? (
            <div style={{
              padding: "46px 18px 12px",
              textAlign: "center",
              color: "var(--soft)",
            }}>
              <div style={{
                width: 72,
                height: 72,
                margin: "0 auto 14px",
                borderRadius: 24,
                background: "linear-gradient(180deg,#ECFDF5 0%,#D1FAE5 100%)",
                color: "#047857",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 16px 36px rgba(16,185,129,0.12)",
              }}>
                <Icon.Bell />
              </div>
              <p style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)" }}>
                Tout est a jour
              </p>
              <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.65 }}>
                Les nouvelles alertes SOS, prises a confirmer et rendez-vous imminents apparaitront ici.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {unreadItems.length > 0 ? (
                <section>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 900, color: "var(--ink)" }}>
                      A consulter
                    </h4>
                    <NotificationChip tone="primary">
                      {unreadItems.length} nouvelle{unreadItems.length > 1 ? "s" : ""}
                    </NotificationChip>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {unreadItems.map((item) => (
                      <NotificationRow
                        key={item.signature}
                        item={item}
                        unread
                        onSelectItem={onSelectItem}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {seenItems.length > 0 ? (
                <section>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 900, color: "var(--ink)" }}>
                      Deja consultees
                    </h4>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>
                      {seenItems.length} element{seenItems.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {seenItems.map((item) => (
                      <NotificationRow
                        key={item.signature}
                        item={item}
                        unread={false}
                        onSelectItem={onSelectItem}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ padding: "12px 14px", animation: "fadeIn .3s" }}>
      <Bone h={220} r={24} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {[88, 88, 88, 88, 88].map((w, i) => <Bone key={i} w={w} h={72} r={14} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginTop: 13 }}>
        {[1, 2, 3].map(i => <Bone key={i} h={82} r={15} />)}
      </div>
      <Bone h={140} r={16} style={{ marginTop: 13 }} />
      <Bone h={220} r={16} style={{ marginTop: 13 }} />
      <Bone h={100} r={16} style={{ marginTop: 13 }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Feedback — Toast + ErrorRetry
───────────────────────────────────────────────────────────── */

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      minWidth: 200, maxWidth: 280, padding: "12px 20px", borderRadius: 20,
      background: type === "error" ? T.danger : T.success,
      color: "white", fontSize: 13, fontWeight: 700, zIndex: 999,
      animation: "scaleIn 0.2s", textAlign: "center",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    }}>
      {message}
    </div>
  );
}

function ErrorRetry({ message, onRetry }) {
  return (
    <div style={{ padding: "48px 20px", textAlign: "center", animation: "fadeIn .3s" }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, margin: "0 auto 14px",
        background: "#FEF2F2", display: "grid", placeItems: "center", fontSize: 24,
      }}>⚠️</div>
      <p style={{ fontSize: 15, color: "var(--ink)", fontWeight: 800, marginBottom: 6 }}>
        Erreur de chargement
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginBottom: 18 }}>
        {message || "Impossible de charger les données."}
      </p>
      <button type="button" onClick={onRetry} style={{
        border: "none", borderRadius: 12, background: T.primary,
        color: "white", padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer",
      }}>
        Réessayer
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TopBar
───────────────────────────────────────────────────────────── */

function TopBar({ greet, viewerName, dateLabel, hasUnread, onBell, bellActive = false }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 40,
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      background: "rgba(236,248,245,0.84)",
      borderBottom: "1px solid rgba(19,78,74,0.10)",
      padding: "10px 16px 11px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 11, color: "var(--muted)", fontWeight: 700,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{dateLabel}</div>
          <div style={{
            marginTop: 2, color: "var(--ink)", fontFamily: SERIF,
            fontSize: 19, lineHeight: 1.1, fontWeight: 400,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{greet}, {viewerName}</div>
        </div>
        <button type="button" aria-label="Notifications" onClick={onBell} style={{
          width: 40, height: 40, borderRadius: 14,
          border: bellActive ? "1px solid rgba(13,148,136,0.28)" : "1px solid rgba(19,78,74,0.12)",
          background: bellActive ? "rgba(236,253,250,0.98)" : "rgba(255,255,255,0.86)", color: "var(--ink)",
          display: "grid", placeItems: "center", cursor: "pointer",
          boxShadow: bellActive
            ? "0 12px 28px rgba(13,148,136,0.18)"
            : "0 8px 20px rgba(13,148,136,0.12)",
          flexShrink: 0,
        }}>
          <span style={{ position: "relative", display: "inline-flex" }}>
            <Icon.BellSmall />
            {hasUnread && (
              <span style={{
                position: "absolute", top: -3, right: -3,
                width: 8, height: 8, borderRadius: "50%",
                background: "#EF4444", border: "1px solid white",
                animation: "pulse 1.25s ease-in-out infinite",
              }} />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HeroCard
──────────────────────���────────────────────────────────────── */

function HeroCard({ hero, kpis, priority, score, homeData, onCta, sosSectionRef }) {
  const skin = prioritySkin(priority.level);
  const isCritical = priority.level === "critical";

  const name   = hero?.name || homeData?.senior?.name || "Votre proche";
  const age    = hero?.age;
  const city   = hero?.city;
  const cond   = hero?.medicalCondition;
  const blood  = hero?.bloodType;
  const mood   = hero?.currentMoodLabel;
  const activeSosStatus = hero?.activeSosStatus;
  const nextApptAt = hero?.nextAppointmentAt || homeData?.nextAppointment?.appointmentAt;

  const meds       = Array.isArray(homeData?.medications) ? homeData.medications : [];
  const totalMeds  = meds.length;
  const takenMeds  = meds.filter(m => String(m?.status || "").toLowerCase() === "taken" || m?.takenAt).length;
  const pendingN   = Math.max(0, totalMeds - takenMeds);
  const adherence  = kpis?.adherence7dPercentage != null
    ? clamp(kpis.adherence7dPercentage)
    : totalMeds > 0 ? clamp((takenMeds / totalMeds) * 100) : 0;

  const moodDisplay = mood || checkinTone(
    homeData?.dailyQuestions?.find(q => q?.latestAnswer)?.latestAnswer
  ).label;

  const progressDeg = clamp(score) * 3.6;

  return (
    <section style={{
      position: "relative", overflow: "hidden", borderRadius: 24,
      padding: "16px 16px 18px", background: skin.grad, color: "white",
      boxShadow: `0 24px 46px ${skin.glow}`,
      animation: isCritical ? "sosHeartbeat 2.8s ease-in-out infinite" : "fadeUp .42s both",
    }}>
      {/* Decorative radial blurs */}
      <div style={{
        position: "absolute", top: -70, right: -40, width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(255,255,255,0.26) 0%,rgba(255,255,255,0) 68%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -90, left: -50, width: 170, height: 170, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(255,255,255,0.20) 0%,rgba(255,255,255,0) 72%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Priority chip */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 999,
          background: skin.chipBg, color: skin.chipColor,
          fontSize: 11, fontWeight: 800,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: skin.chipColor,
            animation: "pulse 1.25s ease-in-out infinite",
          }} />
          {priority.title}
        </div>

        {/* Name row + score ring */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: SERIF, fontSize: 28, lineHeight: 1.04,
              fontWeight: 400, letterSpacing: "-0.01em", marginBottom: 6,
            }}>{name}</h2>

            {/* Age · City badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
              {age != null && (
                <span style={{
                  padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)",
                }}>{age} ans</span>
              )}
              {city && (
                <span style={{
                  padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)",
                }}>{city}</span>
              )}
            </div>

            {/* Medical condition + blood type */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {cond && (
                <span style={{
                  padding: "3px 8px", borderRadius: 8, fontSize: 10.5, fontWeight: 700,
                  background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.20)",
                }}>{cond}</span>
              )}
              {blood && (
                <span style={{
                  padding: "3px 8px", borderRadius: 8, fontSize: 10.5, fontWeight: 800,
                  background: "rgba(239,68,68,0.22)", border: "1px solid rgba(239,68,68,0.32)",
                  color: "#FCA5A5",
                }}>{blood}</span>
              )}
            </div>
          </div>

          {/* Score ring */}
          <div style={{ width: 90, flexShrink: 0, display: "grid", placeItems: "center" }}>
            <div style={{
              width: 86, height: 86, borderRadius: "50%", display: "grid", placeItems: "center",
              background: `conic-gradient(${skin.ring} ${progressDeg}deg,rgba(255,255,255,0.18) 0deg)`,
              boxShadow: "0 8px 22px rgba(15,23,42,0.28)",
            }}>
              <div style={{
                width: 65, height: 65, borderRadius: "50%",
                background: "rgba(9,24,22,0.38)", border: "1px solid rgba(255,255,255,0.30)",
                display: "grid", placeItems: "center", textAlign: "center",
                backdropFilter: "blur(3px)",
              }}>
                <strong style={{ fontSize: 19, lineHeight: 1, fontWeight: 900, display: "block" }}>{score}</strong>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".05em", opacity: 0.8, marginTop: 1 }}>
                  SCORE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SOS ACTIF banner */}
        {activeSosStatus && (
          <button
            type="button"
            aria-label="Voir les alertes SOS"
            onClick={() => sosSectionRef?.current?.scrollIntoView({ behavior: "smooth" })}
            style={{
              marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 12,
              background: "rgba(239,68,68,0.24)", border: "1px solid rgba(239,68,68,0.42)",
              color: "white", fontSize: 13, fontWeight: 900, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              animation: "sosHeartbeat 2.8s ease-in-out infinite",
            }}
          >
            <span style={{
              width: 9, height: 9, borderRadius: "50%", background: "#EF4444",
              animation: "pulse 1s ease-in-out infinite",
            }} />
            SOS ACTIF — {activeSosStatus}
          </button>
        )}

        {/* Info chips */}
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px",
            borderRadius: 10, background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.20)", fontSize: 11, fontWeight: 700,
          }}>
            📅 {nextApptAt ? formatFamilyDateTime(nextApptAt) : "Aucun RDV programmé"}
          </span>
          {moodDisplay && moodDisplay !== "Aucun" && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px",
              borderRadius: 10, background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.20)", fontSize: 11, fontWeight: 700,
            }}>
              {getMoodEmoji(moodDisplay)} {moodDisplay}
            </span>
          )}
        </div>

        {/* Mini stat tiles */}
        <div style={{
          marginTop: 12, display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8,
        }}>
          {[
            { value: `${adherence}%`, label: "Observance" },
            { value: pendingN, label: "En attente" },
            { value: moodDisplay || "--", label: "Humeur" },
          ].map(s => (
            <div key={s.label} style={{
              borderRadius: 13, background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.20)", padding: "8px 8px 7px",
            }}>
              <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
              <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, opacity: 0.84 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button type="button" onClick={onCta} style={{
          marginTop: 12, width: "100%",
          border: "1px solid rgba(255,255,255,0.32)", borderRadius: 13,
          background: "rgba(255,255,255,0.16)", color: "white",
          padding: "10px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer",
          display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
        }}>
          {priority.cta}
          <Icon.ArrowRight />
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   KPI Strip
───────────────────────────────────────────────────────────── */

function HealthArc({ score: s, size = 38 }) {
  const r      = (size - 6) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - clamp(s) / 100);
  const color  = scoreColor(clamp(s));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function KpiStrip({ kpis, homeData, score }) {
  const adh       = kpis?.adherence7dPercentage != null ? clamp(kpis.adherence7dPercentage) : null;
  const checkins  = kpis?.checkins7dCount ?? "--";
  const activeMed = kpis?.activeMedicationsCount
    ?? (Array.isArray(homeData?.medications) ? homeData.medications.length : "--");
  const activeSos = kpis?.activeSosCount ?? 0;

  const tiles = [
    { id: "adh",  value: adh != null ? `${adh}%` : "--%", label: "Observance 7j",  color: "var(--ink)", arc: false },
    { id: "chk",  value: checkins,                          label: "Bilans semaine", color: "var(--ink)", arc: false },
    { id: "sc",   value: null,                              label: "Score santé",    color: "var(--ink)", arc: true  },
    { id: "med",  value: activeMed,                         label: "Médicaments",   color: "var(--ink)", arc: false },
    { id: "sos",  value: activeSos,                         label: "Alertes SOS",   color: activeSos > 0 ? T.danger : T.success, arc: false },
  ];

  return (
    <section style={{ marginTop: 13, animation: "fadeUp .42s .04s both" }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {tiles.map(tile => (
          <div key={tile.id} style={{
            flexShrink: 0, width: 88,
            background: "#FFFFFF", borderRadius: 14,
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "0 2px 10px rgba(13,148,136,0.06)",
            padding: "10px 8px 9px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
          }}>
            {tile.arc ? (
              <div style={{ position: "relative", width: 38, height: 38 }}>
                <HealthArc score={score} size={38} />
                <span style={{
                  position: "absolute", inset: 0, display: "grid", placeItems: "center",
                  fontSize: 11, fontWeight: 900, color: scoreColor(clamp(score)),
                }}>{score}</span>
              </div>
            ) : (
              <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1, color: tile.color }}>
                {tile.value}
              </span>
            )}
            <span style={{
              fontSize: 9.5, fontWeight: 700, color: "var(--muted)",
              textAlign: "center", lineHeight: 1.3,
            }}>{tile.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Quick Actions
───────────────────────────────────────────────────────────── */

function QuickActions({ onNavigate }) {
  const acts = [
    { id: "family_health",    label: "Traitements", icon: Icon.Pill,     bg: "#ECFEFF", color: "#0F766E" },
    { id: "family_calendar",  label: "Agenda",      icon: Icon.Calendar, bg: "#F0F9FF", color: "#0369A1" },
    { id: "family_assistant", label: "Assistant",   icon: Icon.Bot,      bg: "#F5F3FF", color: "#6D28D9" },
  ];
  return (
    <section style={{ marginTop: 13, animation: "fadeUp .42s .08s both" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9 }}>
        {acts.map(a => (
          <button key={a.id} type="button" onClick={() => onNavigate(a.id)} style={{
            border: "1px solid rgba(15,23,42,0.06)", borderRadius: 15,
            background: "rgba(255,255,255,0.94)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
            padding: "11px 8px 10px", cursor: "pointer",
            display: "flex", flexDirection: "column", gap: 7,
            alignItems: "center", justifyContent: "center", minHeight: 82,
          }}>
            <span style={{
              width: 34, height: 34, borderRadius: 11,
              background: a.bg, color: a.color,
              display: "grid", placeItems: "center",
            }}>
              <a.icon active />
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ink)" }}>{a.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   SOS Section
───────────────────────────────────────────────────────────── */

function SosSection({ alerts, onAction, shakeId }) {
  const [confirming, setConfirming] = useState(null); // { alertId, action }
  const timerRef = useRef(null);

  useEffect(() => {
    if (!confirming) return;
    timerRef.current = setTimeout(() => setConfirming(null), 5000);
    return () => clearTimeout(timerRef.current);
  }, [confirming]);

  const active = alerts.filter(a => a.status === "triggered" || a.status === "acknowledged");
  if (!active.length) return null;

  return (
    <section style={{ marginTop: 13, animation: "fadeUp .42s .10s both" }}>
      <h3 style={{ fontSize: 14, fontWeight: 900, color: "var(--ink)", marginBottom: 8 }}>
        🆘 Alertes SOS actives
      </h3>
      {active.map(alert => {
        const isConfirming = confirming?.alertId === alert.id;
        const isTrigger    = alert.status === "triggered";
        const borderColor  = isTrigger ? T.danger : T.warning;

        return (
          <div key={alert.id} style={{
            background: "#FFFFFF", borderRadius: 16,
            boxShadow: "0 2px 12px rgba(13,148,136,0.08)",
            marginBottom: 10, padding: "14px 14px 12px",
            borderLeft: `4px solid ${borderColor}`,
            animation: shakeId === alert.id ? "shake 0.4s" : undefined,
          }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{
                padding: "3px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 800,
                background: isTrigger ? "#FEE2E2" : "#FFEDD5",
                color: isTrigger ? "#B91C1C" : "#C2410C",
              }}>
                {isTrigger ? "Déclenchée" : "Accusée de réception"}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
                {formatFamilyDateTime(alert.triggeredAt)}
              </span>
            </div>

            {/* Comment */}
            <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
              {alert.comment || "Alerte déclenchée par le senior."}
            </p>

            {/* Actions */}
            {isConfirming ? (
              <div style={{ marginTop: 10, display: "flex", gap: 8, animation: "fadeIn 0.15s" }}>
                <button type="button" onClick={() => { onAction(alert.id, confirming.action); setConfirming(null); }}
                  style={{
                    flex: 1, border: "none", borderRadius: 10,
                    background: confirming.action === "resolve" ? T.success : T.warning,
                    color: "white", padding: "9px 0", fontSize: 12, fontWeight: 800, cursor: "pointer",
                  }}>
                  Confirmer
                </button>
                <button type="button" onClick={() => setConfirming(null)}
                  style={{
                    flex: 1, border: "1px solid #E2E8F0", borderRadius: 10,
                    background: "white", color: "var(--ink)",
                    padding: "9px 0", fontSize: 12, fontWeight: 800, cursor: "pointer",
                  }}>
                  Annuler
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                {isTrigger && (
                  <button type="button"
                    onClick={() => setConfirming({ alertId: alert.id, action: "acknowledge" })}
                    style={{
                      flex: 1, border: "none", borderRadius: 10,
                      background: T.warning, color: "white",
                      padding: "9px 0", fontSize: 12, fontWeight: 800, cursor: "pointer",
                    }}>
                    Accuser réception
                  </button>
                )}
                <button type="button"
                  onClick={() => setConfirming({ alertId: alert.id, action: "resolve" })}
                  style={{
                    flex: 1, border: "none", borderRadius: 10,
                    background: T.success, color: "white",
                    padding: "9px 0", fontSize: 12, fontWeight: 800, cursor: "pointer",
                  }}>
                  Résoudre
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Mood Strip — 7-day bar chart
───────────────────────────────────────────────────────────── */

function MoodStrip({ moodStrip, homeDailyQuestions }) {
  const [activeIdx, setActiveIdx] = useState(null);

  const days = useMemo(() => {
    const strip  = Array.isArray(moodStrip) ? moodStrip : [];
    const result = [];
    const today  = new Date();

    for (let i = 6; i >= 0; i--) {
      const d   = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const entry = strip.find(s => s.date === key);

      let score = entry?.moodScore ?? null;
      let label = entry?.moodLabel ?? null;

      // Fallback for today from home checkins
      if (i === 0 && !label && Array.isArray(homeDailyQuestions)) {
        const answered = homeDailyQuestions.find(q => q?.latestAnswer);
        if (answered) {
          const tone = checkinTone(answered.latestAnswer);
          label = tone.label;
          score = tone.mood === "good" ? 1 : tone.mood === "hard" ? 3 : 2;
        }
      }

      result.push({
        date: key,
        dayLabel: FR_DAYS[d.getDay()],
        score, label,
        isToday: i === 0,
      });
    }
    return result;
  }, [moodStrip, homeDailyQuestions]);

  const MAX_H = 58;
  const filledDays = days.filter(d => d.score != null || d.label).length;

  return (
    <section style={{
      marginTop: 13,
      background: "#FFFFFF", borderRadius: 16,
      boxShadow: "0 2px 12px rgba(13,148,136,0.08)",
      padding: "14px 14px 12px",
      animation: "fadeUp .42s .14s both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: "var(--ink)" }}>Humeur sur 7 jours</h3>
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{filledDays}/7 jours</span>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7,1fr)",
        gap: 5, alignItems: "flex-end", minHeight: MAX_H + 28,
      }}>
        {days.map((day, idx) => {
          const hasData = day.score != null || day.label;
          const bp      = getMoodBarProps(day.label, day.score);
          const barH    = hasData ? Math.max(10, (bp.h / 100) * MAX_H) : 6;

          return (
            <div
              key={day.date}
              onClick={() => hasData && setActiveIdx(activeIdx === idx ? null : idx)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 4, position: "relative", cursor: hasData ? "pointer" : "default",
              }}
            >
              {/* Tooltip */}
              {activeIdx === idx && hasData && (
                <div style={{
                  position: "absolute", bottom: "100%", left: "50%",
                  transform: "translateX(-50%)", marginBottom: 8,
                  background: "#1E293B", color: "white",
                  padding: "5px 9px", borderRadius: 8,
                  fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
                  animation: "fadeIn 0.15s", zIndex: 10, pointerEvents: "none",
                }}>
                  {day.label || "—"} · {formatFamilyDate(day.date)}
                  <div style={{
                    position: "absolute", top: "100%", left: "50%",
                    transform: "translateX(-50%)",
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "5px solid #1E293B",
                  }} />
                </div>
              )}

              {/* Bar */}
              <div style={{
                width: "100%", maxWidth: 26, height: barH,
                borderRadius: "5px 5px 3px 3px",
                background: hasData ? bp.color : "#E2E8F0",
                opacity: hasData ? 1 : 0.5,
                transition: "height 0.4s ease",
              }} />

              {/* Day label */}
              <span style={{
                fontSize: 10.5,
                fontWeight: day.isToday ? 800 : 600,
                color: day.isToday ? "var(--ink)" : "var(--muted)",
              }}>{day.dayLabel}</span>

              {/* Today dot */}
              {day.isToday && (
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: T.primary, marginTop: -2,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Activity Timeline
───────────────────────────────────────────────────────────── */

function ActivityTimeline({ dashboardTimeline, homeData, loading, onRefresh }) {
  const rows = useMemo(() => {
    if (Array.isArray(dashboardTimeline) && dashboardTimeline.length > 0)
      return dashboardTimeline.slice(0, 10);

    // Fallback from home data
    const list = [];
    const meds = Array.isArray(homeData?.medications) ? homeData.medications : [];
    meds.forEach((m, i) => {
      const taken = String(m?.status || "").toLowerCase() === "taken" || m?.takenAt;
      list.push({
        type: taken ? "medication:taken" : "medication:pending",
        title: taken ? "Médication prise" : `${m?.name || "Médication"} en attente`,
        subtitle: taken
          ? `${m?.name || ""}${m?.dosage ? ` · ${m.dosage}` : ""}`
          : m?.time ? `Prévue à ${m.time}` : "En attente",
        occurredAt: m?.takenAt || m?.scheduledAt || m?.time,
        status: m?.status || "pending",
        _key: `med-${i}`,
      });
    });
    const sos = homeData?.latestSosAlert;
    if (sos) list.push({
      type: `sos:${sos.status || "triggered"}`,
      title: "Alerte SOS",
      subtitle: sos.comment || "Alerte déclenchée",
      occurredAt: sos.triggeredAt,
      status: sos.status,
      _key: "sos",
    });
    const appt = homeData?.nextAppointment;
    if (appt) list.push({
      type: "appointment:scheduled",
      title: "Rendez-vous médical",
      subtitle: appt.doctorName || appt.specialty || "Consultation",
      occurredAt: appt.appointmentAt,
      status: appt.status || "scheduled",
      _key: "appt",
    });
    return list
      .sort((a, b) => parseTs(b.occurredAt, 0) - parseTs(a.occurredAt, 0))
      .slice(0, 10);
  }, [dashboardTimeline, homeData]);

  return (
    <section style={{
      marginTop: 13,
      background: "#FFFFFF", borderRadius: 16,
      boxShadow: "0 2px 12px rgba(13,148,136,0.08)",
      padding: "14px 14px 14px",
      animation: "fadeUp .42s .18s both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: "var(--ink)" }}>Fil de la journée</h3>
        <button type="button" onClick={onRefresh} disabled={loading}
          aria-label="Actualiser le fil"
          style={{
            borderRadius: 10, border: "1px solid rgba(15,23,42,0.10)",
            background: "white", padding: "5px 10px",
            fontSize: 11.5, fontWeight: 800, color: "var(--ink)",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
          }}>
          {loading ? "Sync..." : "Actualiser"}
        </button>
      </div>

      {!rows.length ? (
        <div style={{ padding: "14px 0 8px", textAlign: "center" }}>
          <div style={{
            display: "inline-grid", placeItems: "center",
            width: 38, height: 38, borderRadius: 12,
            background: "#F1F5F9", fontSize: 18,
          }}>📋</div>
          <p style={{ marginTop: 8, fontSize: 12.5, color: "var(--muted)" }}>
            Aucune activité remontée pour le moment.
          </p>
        </div>
      ) : (
        <div>
          {rows.map((row, i) => {
            const meta = timelineMeta(row.type);
            const key  = row._key || `${row.type}-${i}`;
            return (
              <div key={key} style={{
                display: "flex", gap: 10,
                paddingBottom: i === rows.length - 1 ? 0 : 12,
              }}>
                {/* Dot + connector */}
                <div style={{
                  width: 22, display: "flex", flexDirection: "column",
                  alignItems: "center", flexShrink: 0,
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: `${meta.color}18`,
                    display: "grid", placeItems: "center",
                    fontSize: 11, marginTop: 1, zIndex: 2,
                  }}>{meta.icon}</span>
                  {i < rows.length - 1 && (
                    <span style={{ width: 2, flex: 1, background: "#E2E8F0", marginTop: 4 }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.35 }}>
                      {row.title}
                    </strong>
                    <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {formatFamilyTime(row.occurredAt)}
                    </span>
                  </div>
                  <p style={{ marginTop: 2, fontSize: 12, color: "var(--soft)", lineHeight: 1.5 }}>
                    {row.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   AI Summary Card
───────────────────────────────────────────────────────────── */

function AiSummaryCard({ aiSummary, priority, tone, onNavigate }) {
  const text        = aiSummary?.text || null;
  const generatedAt = aiSummary?.generatedAt || null;

  const fallbackText = priority.level === "critical"
    ? "Priorité immédiate : traiter l'alerte SOS puis vérifier les derniers échanges dans l'assistant."
    : "Aucun résumé IA disponible pour le moment. Consultez le journal de l'assistant pour les détails.";

  return (
    <section style={{
      marginTop: 13,
      background: "linear-gradient(140deg,#ECFEFF 0%,#F0F9FF 48%,#F8FAFC 100%)",
      border: "1px solid rgba(14,165,233,0.18)",
      borderRadius: 16, padding: "14px 14px 12px",
      boxShadow: "0 2px 12px rgba(14,165,233,0.10)",
      animation: "fadeUp .42s .22s both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: "var(--ink)" }}>Résumé IA</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {generatedAt && (
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>
              {formatFamilyDate(generatedAt)}
            </span>
          )}
          <button type="button" onClick={() => onNavigate("family_assistant")} style={{
            border: "none", background: "transparent", color: "#0369A1",
            fontSize: 11.5, fontWeight: 800, cursor: "pointer", padding: 0,
          }}>
            Voir journal
          </button>
        </div>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--soft)" }}>
        {text || fallbackText}
      </p>

      {tone && tone.label !== "Aucun" && (
        <div style={{
          marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
          borderRadius: 999, background: "rgba(255,255,255,0.8)",
          border: "1px solid rgba(14,165,233,0.18)",
          padding: "4px 9px", fontSize: 10.5, fontWeight: 800, color: "#0369A1",
        }}>
          Humeur <strong>{tone.label}</strong> {getMoodEmoji(tone.label)}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Empty State
───────────────────────────────────────────────────────────── */

function EmptyState({ onNavigate }) {
  return (
    <section style={{
      marginTop: 12, borderRadius: 22,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "rgba(255,255,255,0.96)",
      padding: "24px 16px 20px",
      boxShadow: "0 18px 38px rgba(15,23,42,0.08)",
      animation: "fadeUp .44s both", textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        display: "grid", placeItems: "center",
        background: "linear-gradient(145deg,#0D9488,#0A7C71)",
        color: "white", margin: "0 auto 12px",
      }}>
        <Icon.Users />
      </div>
      <h2 style={{ color: "var(--ink)", fontFamily: SERIF, fontSize: 26, lineHeight: 1.1, fontWeight: 400 }}>
        Aucun proche relié
      </h2>
      <p style={{ marginTop: 8, color: "var(--soft)", fontSize: 13.5, lineHeight: 1.6, maxWidth: 260, margin: "8px auto 0" }}>
        Associez un senior dans Réglages pour activer le tableau de suivi famille.
      </p>
      <button type="button" onClick={() => onNavigate("family_settings")} style={{
        marginTop: 16, border: "none", borderRadius: 13,
        background: "linear-gradient(140deg,#0D9488 0%,#0A7C71 100%)",
        color: "white", fontSize: 13, fontWeight: 800,
        padding: "11px 20px", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        Aller aux Réglages
        <Icon.ArrowRight />
      </button>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main — FamilyDashboard
───────────────────────────────────────────────────────────── */

export default function FamilyDashboard({ user, onNavigate = () => {} }) {
  const effectiveUser = useMemo(() => getEffectiveFamilyUser(user), [user]);
  const { seniorId, isResolvingSenior } = useFamilySeniorId(user);

  /* ── State ── */
  const [homeData,   setHomeData]   = useState(null);
  const [dashData,   setDashData]   = useState(null);
  const [sosAlerts,  setSosAlerts]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const [shakeId,    setShakeId]    = useState(null);
  const [dateLabel,  setDateLabel]  = useState(nowLabel);
  const [greet,      setGreet]      = useState(greeting);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState([]);
  const [notificationsHydrated, setNotificationsHydrated] = useState(false);

  const sosSectionRef = useRef(null);
  const notificationsStorageId = useMemo(() => notificationStorageKey(seniorId), [seniorId]);

  /* ── Clock tick ── */
  useEffect(() => {
    const id = setInterval(() => {
      setDateLabel(nowLabel());
      setGreet(greeting());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setNotificationsHydrated(false);
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(notificationsStorageId);
      const parsed = raw ? JSON.parse(raw) : [];
      setSeenNotificationIds(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
    } catch {
      setSeenNotificationIds([]);
    } finally {
      setNotificationsHydrated(true);
    }
  }, [notificationsStorageId]);

  useEffect(() => {
    if (!notificationsOpen || typeof window === "undefined") return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notificationsOpen]);

  /* ── Toast helpers ── */
  const showToast   = useCallback((type, message) => setToast({ type, message }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  /* ── Fetch all data ── */
  const fetchData = useCallback(async () => {
    if (!seniorId) {
      if (isResolvingSenior) {
        setLoading(true);
        setError(null);
        return;
      }
      setHomeData(null);
      setDashData(null);
      setSosAlerts([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [homeRes, dashRes] = await Promise.allSettled([
        getSeniorHome({ seniorId }),
        getFamilyDashboard({ seniorId }),
      ]);

      const home = homeRes.status === "fulfilled" ? homeRes.value : null;
      const dash = dashRes.status === "fulfilled" ? dashRes.value : null;

      if (!home && !dash) {
        const err = homeRes.reason || dashRes.reason;
        throw err instanceof Error ? err : new Error(String(err?.message || "Erreur de chargement."));
      }

      setHomeData(home);
      setDashData(dash);

      // Fetch SOS history when active alerts detected
      const activeSosCount = dash?.kpis?.activeSosCount || 0;
      const hasSosFromHome = home?.latestSosAlert &&
        isActiveSosStatus(home.latestSosAlert.status);

      if (activeSosCount > 0 || hasSosFromHome) {
        try {
          const sosRes = await getSosHistory({ seniorId, limit: 5 });
          const fetched = Array.isArray(sosRes?.alerts) ? sosRes.alerts : [];
          // Merge with home SOS as fallback
          if (!fetched.length && hasSosFromHome) {
            setSosAlerts([home.latestSosAlert]);
          } else {
            setSosAlerts(fetched);
          }
        } catch {
          setSosAlerts(hasSosFromHome ? [home.latestSosAlert] : []);
        }
      } else {
        setSosAlerts([]);
      }
    } catch (err) {
      setError(err?.message || "Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, [isResolvingSenior, seniorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── SOS action handler (optimistic + rollback) ── */
  const handleSosAction = useCallback(async (alertId, action) => {
    let previous;
    setSosAlerts(prev => {
      previous = [...prev];
      return prev.map(a =>
        a.id === alertId
          ? { ...a, status: action === "acknowledge" ? "acknowledged" : "resolved" }
          : a
      );
    });

    try {
      if (action === "acknowledge") {
        await acknowledgeSosAlert({ alertId });
      } else {
        await resolveSosAlert({ alertId });
      }
      showToast("success", action === "acknowledge"
        ? "Alerte accusée de réception."
        : "Alerte résolue avec succès.");
    } catch (err) {
      // Rollback optimistic update
      setSosAlerts(previous);
      setShakeId(alertId);
      setTimeout(() => setShakeId(null), 500);
      showToast("error", err?.message || "Erreur lors du traitement.");
    }
  }, [showToast]);

  /* ── Derived values ── */
  const activeSosAlerts = useMemo(
    () => (Array.isArray(sosAlerts) ? sosAlerts.filter((alert) => isActiveSosStatus(alert?.status)) : []),
    [sosAlerts]
  );

  const hero = useMemo(() => {
    const baseHero = dashData?.hero || null;
    if (!baseHero) {
      return null;
    }

    const nextStatus = deriveActiveSosStatus(sosAlerts, baseHero.activeSosStatus);
    if ((baseHero.activeSosStatus || null) === nextStatus) {
      return baseHero;
    }

    return { ...baseHero, activeSosStatus: nextStatus };
  }, [dashData, sosAlerts]);

  const kpis = useMemo(() => {
    const baseKpis = dashData?.kpis || null;
    if (!baseKpis || !Array.isArray(sosAlerts) || sosAlerts.length === 0) {
      return baseKpis;
    }

    const nextActiveSosCount = activeSosAlerts.length;
    if ((baseKpis.activeSosCount || 0) === nextActiveSosCount) {
      return baseKpis;
    }

    return { ...baseKpis, activeSosCount: nextActiveSosCount };
  }, [activeSosAlerts.length, dashData, sosAlerts]);

  const meds      = useMemo(() => Array.isArray(homeData?.medications) ? homeData.medications : [], [homeData]);
  const takenMeds = meds.filter(m => String(m?.status || "").toLowerCase() === "taken" || m?.takenAt).length;
  const pendingN  = Math.max(0, meds.length - takenMeds);

  const adherence = useMemo(() => {
    const d = Number.parseFloat(kpis?.adherence7dPercentage);
    if (Number.isFinite(d)) return clamp(d);
    return meds.length > 0 ? clamp((takenMeds / meds.length) * 100) : 0;
  }, [kpis?.adherence7dPercentage, meds.length, takenMeds]);

  const score = useMemo(() => {
    const d = Number.parseInt(kpis?.healthScore, 10);
    if (Number.isFinite(d)) return clamp(d);
    const rawAnswer = homeData?.dailyQuestions?.find(q => q?.latestAnswer)?.latestAnswer;
    const tone      = checkinTone(rawAnswer);
    const moodVal   = tone.mood === "good" ? 100 : tone.mood === "hard" ? 22 : 52;
    const alertVal  = sosAlerts.some(a => a.status === "triggered") ? 0 : 100;
    return clamp(adherence * 0.5 + moodVal * 0.4 + alertVal * 0.1);
  }, [kpis?.healthScore, adherence, homeData, sosAlerts]);

  const tone = useMemo(() => {
    const label = hero?.currentMoodLabel;
    if (label) {
      const l = label.toLowerCase();
      return {
        label,
        mood: l.includes("bien") || l.includes("bon") ? "good" : l.includes("difficile") ? "hard" : "mid",
        color: getMoodColor(label),
      };
    }
    return checkinTone(homeData?.dailyQuestions?.find(q => q?.latestAnswer)?.latestAnswer);
  }, [hero?.currentMoodLabel, homeData]);

  const activeSos = (kpis?.activeSosCount || 0) > 0 || activeSosAlerts.length > 0;

  const nextMedAt  = homeData?.nextMedication?.scheduledAt || null;
  const nextApptDetails = homeData?.nextAppointment || null;
  const nextApptAt = hero?.nextAppointmentAt || homeData?.nextAppointment?.appointmentAt || null;
  const nextApptStatus = String(homeData?.nextAppointment?.status || "scheduled").toLowerCase();

  const notificationItems = useMemo(() => {
    const items = [];

    activeSosAlerts.forEach((alert) => {
      const status = String(alert?.status || "").toLowerCase();
      const isTriggered = status === "triggered";
      items.push({
        id: `sos-${alert.id}`,
        signature: `sos-${alert.id}-${status}-${alert?.triggeredAt || ""}`,
        kind: "sos",
        status,
        severity: isTriggered ? "critical" : "attention",
        sortRank: isTriggered ? 0 : 1,
        sortValue: -notificationTimestamp(alert?.triggeredAt),
        title: isTriggered ? "Alerte SOS en cours" : "SOS en attente de cloture",
        body: alert?.comment || (
          isTriggered
            ? "Votre proche a demande de l'aide. Verifiez rapidement la situation."
            : "L'alerte a ete prise en compte, mais elle n'est pas encore resolue."
        ),
        timeLabel: formatFamilyTime(alert?.triggeredAt),
        ctaLabel: "Voir l'alerte",
        badgeLabel: isTriggered ? "Urgent" : "Suivi",
        badgeTone: isTriggered ? "critical" : "attention",
        sourceLabel: "Securite",
        accentColor: isTriggered ? T.danger : T.warning,
        route: "sos",
      });
    });

    if (pendingN > 0) {
      const medicationLeadMinutes = minutesDiff(nextMedAt);
      const medicationSoon = medicationLeadMinutes != null && medicationLeadMinutes <= 180;
      items.push({
        id: "medications-pending",
        signature: `medications-pending-${pendingN}-${nextMedAt || "none"}`,
        kind: "medication",
        severity: medicationSoon ? "attention" : "primary",
        sortRank: 2,
        sortValue: notificationTimestamp(nextMedAt),
        title: `${pendingN} prise${pendingN > 1 ? "s" : ""} a confirmer`,
        body: nextMedAt
          ? `La prochaine prise connue est prevue ${relTime(nextMedAt).toLowerCase()}.`
          : "Certaines prises de medicaments n'ont pas encore ete confirmees aujourd'hui.",
        timeLabel: nextMedAt ? formatFamilyTime(nextMedAt) : "Aujourd'hui",
        ctaLabel: "Voir les soins",
        badgeLabel: medicationSoon ? "A surveiller" : "Traitements",
        badgeTone: medicationSoon ? "attention" : "primary",
        sourceLabel: pendingN > 1 ? `${pendingN} elements en attente` : "1 element en attente",
        accentColor: "#0F766E",
        route: "family_health",
      });
    }

    const appointmentLeadMinutes = minutesDiff(nextApptAt);
    if (
      nextApptAt
      && nextApptStatus !== "cancelled"
      && nextApptStatus !== "canceled"
      && appointmentLeadMinutes != null
      && appointmentLeadMinutes > 0
      && appointmentLeadMinutes <= 24 * 60
    ) {
      const appointmentTitle = appointmentNotificationTitle(nextApptAt);
      const appointmentSource = nextApptDetails?.doctorName
        ? `Dr ${nextApptDetails.doctorName}`
        : nextApptDetails?.specialty || "Consultation";
      items.push({
        id: "next-appointment",
        signature: `appointment-${nextApptAt}-${nextApptStatus}-${appointmentSource}`,
        kind: "appointment",
        severity: appointmentLeadMinutes <= 180 ? "attention" : "info",
        sortRank: 3,
        sortValue: notificationTimestamp(nextApptAt),
        title: appointmentTitle,
        body: `${appointmentSource} programme le ${formatFamilyDateTime(nextApptAt)}.`,
        timeLabel: formatFamilyTime(nextApptAt),
        ctaLabel: "Voir agenda",
        badgeLabel: appointmentLeadMinutes <= 180 ? "Bientot" : "Agenda",
        badgeTone: appointmentLeadMinutes <= 180 ? "attention" : "info",
        sourceLabel: "Rendez-vous medical",
        accentColor: "#0369A1",
        route: "family_calendar",
      });
    }

    return items.sort((a, b) => (
      a.sortRank - b.sortRank || a.sortValue - b.sortValue
    ));
  }, [activeSosAlerts, nextApptAt, nextApptDetails, nextApptStatus, nextMedAt, pendingN]);

  const priority = useMemo(
    () => computePriority({ activeSos, pendingMeds: pendingN, nextMedAt, nextApptAt }),
    [activeSos, pendingN, nextMedAt, nextApptAt]
  );

  const unreadNotificationIds = useMemo(() => {
    const seenSet = new Set(seenNotificationIds);
    return notificationItems
      .map((item) => item.signature)
      .filter((signature) => !seenSet.has(signature));
  }, [notificationItems, seenNotificationIds]);

  const notificationSignatureKey = useMemo(
    () => notificationItems.map((item) => item.signature).join("|"),
    [notificationItems]
  );

  useEffect(() => {
    setSeenNotificationIds((prev) => {
      if (!prev.length) return prev;
      const validIds = new Set(notificationItems.map((item) => item.signature));
      const next = prev.filter((id) => validIds.has(id));
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [notificationSignatureKey, notificationItems]);

  useEffect(() => {
    if (!notificationsHydrated) return;
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(notificationsStorageId, JSON.stringify(seenNotificationIds));
    } catch {}
  }, [notificationsHydrated, notificationsStorageId, seenNotificationIds]);

  const viewerName = getFamilyFirstName(effectiveUser?.name, "Famille");
  const hasUnread  = unreadNotificationIds.length > 0;
  const hasData    = !!(homeData || dashData);
  const isNetwork  = !!(error && (
    error.toLowerCase().includes("impossible de joindre") ||
    error.toLowerCase().includes("failed to fetch")
  ));

  const markNotificationsRead = useCallback((ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    setSeenNotificationIds((prev) => {
      const next = new Set(prev);
      ids.filter(Boolean).forEach((id) => next.add(id));
      return Array.from(next);
    });
  }, []);

  const handleMarkAllNotificationsRead = useCallback(() => {
    markNotificationsRead(notificationItems.map((item) => item.signature));
  }, [markNotificationsRead, notificationItems]);

  const handleNotificationSelect = useCallback((item) => {
    if (!item) {
      return;
    }

    markNotificationsRead([item.signature]);
    setNotificationsOpen(false);

    if (item.route === "sos") {
      setTimeout(() => {
        sosSectionRef?.current?.scrollIntoView({ behavior: "smooth" });
      }, 120);
      return;
    }

    if (item.route) {
      onNavigate(item.route);
    }
  }, [markNotificationsRead, onNavigate]);

  /* ── Render ── */
  return (
    <Phone bg="#ECF8F5">
      <div style={{
        "--ink": "#0D3B39", "--soft": "#1E5A56", "--muted": "#5A8682",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 5% 2%,rgba(153,246,228,0.45) 0%,rgba(153,246,228,0) 32%)," +
          "radial-gradient(circle at 95% 18%,rgba(125,211,252,0.28) 0%,rgba(125,211,252,0) 33%)," +
          "#ECF8F5",
        fontFamily: BODY, color: "var(--ink)", position: "relative",
      }}>
        {/* Network error banner */}
        {isNetwork && (
          <div style={{
            background: "#FEF2F2", borderBottom: "1px solid #FECACA",
            color: T.danger, fontSize: 11.5, fontWeight: 700,
            padding: "7px 16px", textAlign: "center",
          }}>
            Connexion backend temporairement indisponible.
          </div>
        )}

        <TopBar
          greet={greet}
          viewerName={viewerName}
          dateLabel={dateLabel}
          hasUnread={hasUnread}
          bellActive={notificationsOpen}
          onBell={() => setNotificationsOpen(true)}
        />

        <main style={{ padding: "12px 14px 112px" }}>
          {/* ── No senior linked ── */}
          {!seniorId && !isResolvingSenior ? (
            <EmptyState onNavigate={onNavigate} />

          /* ── Initial skeleton ── */
          ) : (isResolvingSenior || (loading && !hasData)) ? (
            <DashboardSkeleton />

          /* ── Hard error with no data ── */
          ) : !loading && error && !hasData ? (
            <ErrorRetry message={error} onRetry={fetchData} />

          /* ── Dashboard content ── */
          ) : (
            <>
              <HeroCard
                hero={hero}
                kpis={kpis}
                priority={priority}
                score={score}
                homeData={homeData}
                onCta={() => onNavigate(priority.route)}
                sosSectionRef={sosSectionRef}
              />

              <KpiStrip kpis={kpis} homeData={homeData} score={score} />

              <QuickActions onNavigate={onNavigate} />

              {/* SOS section — only rendered when active alerts exist */}
              <div ref={sosSectionRef}>
                <SosSection alerts={sosAlerts} onAction={handleSosAction} shakeId={shakeId} />
              </div>

              <MoodStrip
                moodStrip={dashData?.moodStrip}
                homeDailyQuestions={homeData?.dailyQuestions}
              />

              <ActivityTimeline
                dashboardTimeline={dashData?.timeline}
                homeData={homeData}
                loading={loading}
                onRefresh={fetchData}
              />

              <AiSummaryCard
                aiSummary={dashData?.aiSummary}
                priority={priority}
                tone={tone}
                onNavigate={onNavigate}
              />
            </>
          )}
        </main>

        <FamilyBottomNav activeTab="family_dashboard" onNavigate={onNavigate} />

        <NotificationsSheet
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          items={notificationItems}
          unreadIds={unreadNotificationIds}
          onSelectItem={handleNotificationSelect}
          onMarkAllRead={handleMarkAllNotificationsRead}
        />

        {/* Toast notification */}
        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
        )}
      </div>
    </Phone>
  );
}
