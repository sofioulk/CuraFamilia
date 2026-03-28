import { useCallback, useEffect, useMemo, useState } from "react";
import { getSeniorHome, parseSeniorIdFromUser, triggerSos } from "../../services/homeApi";
import { T } from "../../styles/theme";

const SOS_BUTTON_COLOR = "#E05C2A";
const BODY_FONT = "'DM Sans', sans-serif";
const CONFIRMATION_TIMEOUT_SECONDS = 30;
const BANNER_VISIBILITY_WINDOW_MS = 30 * 60 * 1000;
const ALERT_REFRESH_INTERVAL_MS = 5000;

function getStoredUser() {
  try {
    const raw = localStorage.getItem("cura_auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function getCountdownColor(seconds) {
  if (seconds <= 1) return "#991B1B";
  if (seconds <= 3) return "#DC2626";
  return "#B45309";
}

function formatAlertTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseAlertDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getAlertIdentity(alert) {
  if (!alert || typeof alert !== "object") return null;
  if (alert.id != null && alert.id !== "") {
    return `id:${alert.id}`;
  }
  if (alert.triggeredAt) {
    return `time:${alert.triggeredAt}`;
  }
  return null;
}

function FeedbackToast({ message = "", tone = "success" }) {
  if (!message) return null;

  const tones = {
    success: { bg: "#ECFDF5", border: "#A7F3D0", color: "#047857" },
    warning: { bg: "#FFF7ED", border: "#FDBA74", color: "#C2410C" },
    danger: { bg: "#FEF2F2", border: "#FECACA", color: "#B91C1C" },
  };
  const currentTone = tones[tone] || tones.success;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 164,
        width: "min(calc(100% - 24px), 358px)",
        background: currentTone.bg,
        border: `1.5px solid ${currentTone.border}`,
        borderRadius: 18,
        padding: "12px 14px",
        color: currentTone.color,
        fontFamily: BODY_FONT,
        fontSize: 13,
        fontWeight: 800,
        lineHeight: 1.4,
        textAlign: "center",
        boxShadow: "0 14px 28px rgba(15,23,42,0.10)",
        zIndex: 80,
      }}
    >
      {message}
    </div>
  );
}

function ConfirmationModal({
  open = false,
  countdown = CONFIRMATION_TIMEOUT_SECONDS,
  sending = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  const countdownColor = getCountdownColor(countdown);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.34)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 90,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="floating-sos-title"
        style={{
          width: "min(calc(100% - 24px), 358px)",
          background: "white",
          borderRadius: 24,
          padding: 20,
          boxShadow: "0 24px 48px rgba(15,23,42,0.18)",
          fontFamily: BODY_FONT,
          color: T.navy,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#FFF2EC",
            color: SOS_BUTTON_COLOR,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 900,
            marginBottom: 14,
          }}
        >
          SOS
        </div>

        <h2
          id="floating-sos-title"
          style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 900, marginBottom: 8 }}
        >
          Envoyer une alerte SOS ?
        </h2>

        <p style={{ fontSize: 14, lineHeight: 1.5, color: T.navyLight, marginBottom: 8 }}>
          {"Votre famille sera pr\u00E9venue imm\u00E9diatement si vous confirmez."}
        </p>

        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: countdownColor,
            fontWeight: 700,
            marginBottom: 18,
            transition: "color 0.25s ease",
          }}
        >
          {"Sans r\u00E9ponse, l'alerte partira automatiquement dans "}{countdown} s.
        </p>

        <button
          type="button"
          onClick={onConfirm}
          disabled={sending}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 16,
            padding: "15px 16px",
            background: SOS_BUTTON_COLOR,
            color: "white",
            fontFamily: BODY_FONT,
            fontSize: 15,
            fontWeight: 800,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.72 : 1,
            marginBottom: 10,
          }}
        >
          {sending ? "Envoi en cours..." : "Oui, envoyer l'alerte"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={sending}
          style={{
            width: "100%",
            borderRadius: 16,
            padding: "14px 16px",
            background: "white",
            color: T.navy,
            fontFamily: BODY_FONT,
            fontSize: 15,
            fontWeight: 800,
            border: `1.5px solid ${T.teal100}`,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.72 : 1,
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

export function SeniorFloatingSos({ user = null }) {
  const effectiveUser = useMemo(() => user || getStoredUser(), [user]);
  const seniorId = useMemo(() => parseSeniorIdFromUser(effectiveUser), [effectiveUser]);

  const [latestSosAlert, setLatestSosAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(CONFIRMATION_TIMEOUT_SECONDS);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ message: "", tone: "success" });
  const [dismissedAlertKey, setDismissedAlertKey] = useState(null);
  const currentAlertKey = getAlertIdentity(latestSosAlert);

  const refreshLatestSosAlert = useCallback(async () => {
    if (!seniorId) {
      setLatestSosAlert(null);
      return;
    }

    try {
      const data = await getSeniorHome({ seniorId });
      setLatestSosAlert(data?.latestSosAlert || null);
    } catch (_error) {
      // Preserve the current banner state if a background refresh fails.
    }
  }, [seniorId]);

  useEffect(() => {
    refreshLatestSosAlert();
  }, [refreshLatestSosAlert]);

  useEffect(() => {
    setDismissedAlertKey(null);
  }, [currentAlertKey]);

  useEffect(() => {
    const triggeredAt = parseAlertDate(latestSosAlert?.triggeredAt);
    if (!triggeredAt) {
      return undefined;
    }

    const status = String(latestSosAlert?.status || "").toLowerCase();
    if (status !== "triggered") {
      return undefined;
    }

    const remainingMs = (triggeredAt.getTime() + BANNER_VISIBILITY_WINDOW_MS) - Date.now();
    if (remainingMs <= 0) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      refreshLatestSosAlert();
    }, ALERT_REFRESH_INTERVAL_MS);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      refreshLatestSosAlert();
    }, remainingMs + 100);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [latestSosAlert?.id, latestSosAlert?.status, latestSosAlert?.triggeredAt, refreshLatestSosAlert]);

  useEffect(() => {
    if (!toast.message) {
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      setToast({ message: "", tone: "success" });
    }, 4200);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!modalOpen || sending) {
      return undefined;
    }

    if (countdown <= 0) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [countdown, modalOpen, sending]);

  const closeModal = () => {
    if (sending) return;
    setModalOpen(false);
    setCountdown(CONFIRMATION_TIMEOUT_SECONDS);
  };

  const sendAlert = useCallback(async (mode = "manual") => {
    if (!seniorId || sending) {
      return;
    }

    setSending(true);
    try {
      const response = await triggerSos({
        seniorId,
        comment: "Alerte déclenchée depuis le bouton SOS flottant.",
      });
      setDismissedAlertKey(null);
      setLatestSosAlert(response?.alert || {
        status: "triggered",
        triggeredAt: new Date().toISOString(),
      });

      const alreadyActive = Boolean(response?.alreadyActive);
      setToast({
        tone: alreadyActive ? "warning" : "success",
        message: alreadyActive
          ? "Votre famille a d\u00E9j\u00E0 \u00E9t\u00E9 pr\u00E9venue."
          : (mode === "timeout"
            ? "Alerte SOS envoy\u00E9e automatiquement."
            : "Alerte SOS envoy\u00E9e. Votre famille a \u00E9t\u00E9 pr\u00E9venue."),
      });
      setModalOpen(false);
      setCountdown(CONFIRMATION_TIMEOUT_SECONDS);
    } catch (error) {
      setToast({
        tone: "danger",
        message: error?.message || "Impossible d'envoyer l'alerte SOS.",
      });
      setModalOpen(false);
      setCountdown(CONFIRMATION_TIMEOUT_SECONDS);
    } finally {
      setSending(false);
    }
  }, [seniorId, sending]);

  useEffect(() => {
    if (!modalOpen || sending || countdown > 0) {
      return;
    }
    sendAlert("timeout");
  }, [countdown, modalOpen, sendAlert, sending]);

  const sosStatus = String(latestSosAlert?.status || "").toLowerCase();
  const alertTriggeredAt = parseAlertDate(latestSosAlert?.triggeredAt);
  const bannerWindowActive = Boolean(
    alertTriggeredAt && ((alertTriggeredAt.getTime() + BANNER_VISIBILITY_WINDOW_MS) > Date.now())
  );
  const bannerDismissed = Boolean(currentAlertKey && dismissedAlertKey === currentAlertKey);
  const sosTriggered = sosStatus === "triggered" && bannerWindowActive && !bannerDismissed;
  const alertTimeLabel = formatAlertTime(latestSosAlert?.triggeredAt);

  if (!seniorId) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes seniorFloatingSosPulse {
          0%, 88%, 100% { transform: scale(1); box-shadow: 0 14px 28px rgba(224,92,42,0.28); }
          92% { transform: scale(1.04); box-shadow: 0 18px 32px rgba(224,92,42,0.34); }
          96% { transform: scale(1.02); box-shadow: 0 16px 30px rgba(224,92,42,0.30); }
        }
      `}</style>

      <FeedbackToast message={toast.message} tone={toast.tone} />

      {!modalOpen && sosTriggered ? (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(calc(100% - 24px), 358px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 999,
            background: "#FFF7ED",
            border: "1px solid #FDBA74",
            boxShadow: "0 12px 24px rgba(15,23,42,0.10)",
            color: "#9A3412",
            fontFamily: BODY_FONT,
            zIndex: 70,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#DC2626",
                boxShadow: "0 0 0 3px rgba(220,38,38,0.12)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {`Famille alert\u00E9e \u00E0 ${alertTimeLabel || "--:--"}`}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                setDismissedAlertKey(null);
                setModalOpen(true);
                setCountdown(CONFIRMATION_TIMEOUT_SECONDS);
              }}
              disabled={sending}
              style={{
                border: "none",
                background: "none",
                color: "#C2410C",
                fontFamily: BODY_FONT,
                fontSize: 13,
                fontWeight: 900,
                cursor: sending ? "not-allowed" : "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                flexShrink: 0,
              }}
            >
              Renvoyer
            </button>

            <button
              type="button"
              onClick={() => setDismissedAlertKey(currentAlertKey)}
              aria-label="Fermer le bandeau SOS"
              style={{
                border: "none",
                background: "none",
                color: "#9A3412",
                fontFamily: BODY_FONT,
                fontSize: 16,
                fontWeight: 900,
                lineHeight: 1,
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
              }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>
      ) : null}

      {!modalOpen && !sosTriggered ? (
        <button
          type="button"
          onClick={() => {
            setModalOpen(true);
            setCountdown(CONFIRMATION_TIMEOUT_SECONDS);
          }}
          disabled={sending}
          aria-label="Ouvrir la confirmation SOS"
          style={{
            position: "fixed",
            right: "max(calc(50% - 179px), 16px)",
            bottom: 96,
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "none",
            background: SOS_BUTTON_COLOR,
            color: "white",
            fontFamily: BODY_FONT,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.3,
            cursor: sending ? "not-allowed" : "pointer",
            boxShadow: "0 14px 28px rgba(224,92,42,0.28)",
            animation: sending ? "none" : "seniorFloatingSosPulse 3s ease-in-out infinite",
            zIndex: 70,
          }}
        >
          SOS
        </button>
      ) : null}

      <ConfirmationModal
        open={modalOpen}
        countdown={countdown}
        sending={sending}
        onConfirm={() => sendAlert("manual")}
        onCancel={closeModal}
      />
    </>
  );
}
