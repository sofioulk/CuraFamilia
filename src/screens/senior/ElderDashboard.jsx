import { useCallback, useEffect, useMemo, useState } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { PrimaryBtn } from "../../components/ui/PrimaryBtn";
import { AppointmentCard } from "../../components/senior/AppointmentCard";
import { BottomNav } from "../../components/senior/BottomNav";
import { formatDisplayFirstName } from "../../utils/nameFormat";
import {
  getSeniorHome,
  markMedicationTaken,
  parseSeniorIdFromUser,
  submitDailyCheckin,
} from "../../services/homeApi";

export const ROLES = [
  { id: "famille", icon: <Icon.Users />, label: "Membre de la famille", desc: "Je gère les médicaments de mes proches âgés" },
  { id: "senior", icon: <Icon.Heart />, label: "Senior", desc: "Je suis la personne suivie par ma famille" },
];

const ACCUEIL_BODY_FONT = "'DM Sans', sans-serif";
const ACCUEIL_TITLE_FONT = "'DM Serif Display', serif";
const SIDE_EFFECTS_ASSISTANT_MESSAGE = "J'ai ressenti des effets ind\u00E9sirables aujourd'hui.";
const CHECKIN_SAVED_MESSAGE = "R\u00E9ponse enregistr\u00E9e \u2713";

function getMinutesUntil(value, nowMs) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.ceil((parsed.getTime() - nowMs) / 60000);
}

function formatHourLabel(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const hour = parsed.getHours();
  const minute = parsed.getMinutes();
  return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, "0")}`;
}

function formatTimeSlotLabel(value) {
  if (!value) return "";
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return String(value).trim();

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return String(value).trim();
  return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, "0")}`;
}

function getNextReturnLabel(medications = []) {
  const timeToMinutes = (timeStr) => {
    const match = String(timeStr).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return 9999;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  };

  const firstTime = medications
    .map((medication) => String(medication?.time || "").trim())
    .filter(Boolean)
    .sort((left, right) => timeToMinutes(left) - timeToMinutes(right))[0];

  if (!firstTime) return "";
  const formattedTime = formatTimeSlotLabel(firstTime);
  return formattedTime ? `Demain à ${formattedTime}` : "Demain";
}

function getTakeActionAvailabilityLabel(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const unlockAt = new Date(parsed.getTime() - (30 * 60 * 1000));
  const hourLabel = formatHourLabel(unlockAt);
  return hourLabel ? `Revenez \u00E0 ${hourLabel}` : "";
}

function formatSmartCountdown(value, nowMs) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const minutesUntil = getMinutesUntil(value, nowMs);
  if (minutesUntil == null) return "";
  if (minutesUntil <= 0) return "Maintenant";
  if (minutesUntil < 60) return `Dans ${minutesUntil} min`;

  const now = new Date(nowMs);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startAfterTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const isToday = parsed >= startToday && parsed < startTomorrow;
  const isTomorrow = parsed >= startTomorrow && parsed < startAfterTomorrow;

  if (isTomorrow) return `Demain \u00E0 ${formatHourLabel(parsed)}`;
  if (isToday && parsed.getHours() >= 18) return `Ce soir \u00E0 ${formatHourLabel(parsed)}`;

  const hoursUntil = Math.ceil(minutesUntil / 60);
  return `Dans ${hoursUntil}h`;
}

function normalizeDosage(value) {
  if (!value) return "";
  return String(value)
    .replace(/\bcomprime\b/gi, "comprim\u00E9")
    .replace(/\bcomprimes\b/gi, "comprim\u00E9s");
}

function getMedicationStatusMeta(status) {
  const key = String(status || "").toLowerCase();
  const map = {
    taken: { label: "Pris", bg: T.successLight, color: T.success },
    pending: { label: "En attente", bg: T.warningLight, color: T.warning },
    upcoming: { label: "\u00C0 venir", bg: "#F0FAF7", color: "#6BA898" },
    missed: { label: "Manque", bg: T.dangerLight, color: T.danger },
  };
  return map[key] || map.pending;
}

function normalizeCheckinText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCheckinOptionVariant(question, answer) {
  const normalizedQuestion = normalizeCheckinText(question);
  const normalizedAnswer = normalizeCheckinText(answer);

  if (normalizedQuestion.includes("effets indesirables")) {
    if (normalizedAnswer === "non") return "positive";
    return "difficult";
  }

  if (normalizedQuestion.includes("bien dormi")) {
    if (normalizedAnswer === "oui") return "positive";
    if (normalizedAnswer.includes("pas vraiment")) return "balanced";
    return "difficult";
  }

  if (normalizedAnswer.includes("bien") || normalizedAnswer.includes("bon") || normalizedAnswer === "oui") return "positive";
  if (normalizedAnswer.includes("moyen") || normalizedAnswer.includes("moyenne") || normalizedAnswer.includes("pas vraiment")) {
    return "balanced";
  }
  if (
    normalizedAnswer.includes("difficile")
    || normalizedAnswer.includes("difficilement")
    || normalizedAnswer === "non"
    || normalizedAnswer.includes("lesquels")
  ) {
    return "difficult";
  }

  return "balanced";
}

function getCheckinOptionLabel(question, answer) {
  const normalizedQuestion = normalizeCheckinText(question);
  const normalizedAnswer = normalizeCheckinText(answer);

  // Keep API payload values untouched; only adapt wording shown in UI.
  if (normalizedQuestion.includes("journee")) {
    if (normalizedAnswer === "bien") return "Bonne";
    if (normalizedAnswer === "moyenne") return "Moyenne";
    if (normalizedAnswer === "difficile") return "Difficile";
  }

  return answer;
}

function shouldConfirmAssistantEscalation(question, answer) {
  const normalizedQuestion = normalizeCheckinText(question);
  const normalizedAnswer = normalizeCheckinText(answer);

  return normalizedQuestion.includes("effets indesirables")
    && normalizedAnswer.includes("lesquels");
}

function scheduleAssistantPrefill(message, attempt = 0) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const nextMessage = String(message || "").trim();
  if (!nextMessage) {
    return;
  }

  const assistantInput = Array.from(document.querySelectorAll("input")).find((element) => {
    const placeholder = normalizeCheckinText(element.getAttribute("placeholder") || "");
    return placeholder.includes("message");
  });

  if (assistantInput) {
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (valueSetter) {
      valueSetter.call(assistantInput, nextMessage);
    } else {
      assistantInput.value = nextMessage;
    }
    assistantInput.dispatchEvent(new Event("input", { bubbles: true }));
    assistantInput.focus();
    try {
      assistantInput.setSelectionRange(nextMessage.length, nextMessage.length);
    } catch (_error) {
      // Ignore browsers that do not support selection on this input instance.
    }
    return;
  }

  if (attempt >= 20) {
    return;
  }

  window.setTimeout(() => {
    scheduleAssistantPrefill(nextMessage, attempt + 1);
  }, 100);
}

function CheckinBars({ variant = "balanced", active = false }) {
  const map = {
    positive: "😁",
    balanced: "😐",
    difficult: "😔",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        opacity: active ? 1 : 0.4,
        filter: active ? "none" : "grayscale(100%)",
        transition: "all 0.2s ease"
      }}
    >
      {map[variant]}
    </span>
  );
}

function HeroProgressDots({ step = 0 }) {
  const isComplete = step >= 3;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      {[0, 1, 2].map((index) => {
        const isPast = index < step - 1;
        const isCurrent = !isComplete && step > 0 && index === step - 1;
        return (
          <span
            key={index}
            style={{
              width: 9,
              height: 8,
              borderRadius: 999,
              background: isComplete
                ? "#34d399"
                : isCurrent
                ? "rgba(255,255,255,0.96)"
                : (isPast ? "#34d399" : "rgba(255,255,255,0.28)"),
              boxShadow: isCurrent ? "0 0 0 1px rgba(255,255,255,0.14) inset" : "none",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

export default function ElderDashboard({ onNavigate = () => {}, user = null }) {
  const [selectedCheckins, setSelectedCheckins] = useState({});
  const [hoveredCheckinOptions, setHoveredCheckinOptions] = useState({});
  const [skippedCheckins, setSkippedCheckins] = useState({});
  const [pendingAssistantCheckin, setPendingAssistantCheckin] = useState(null);
  const [checkinFeedbackMessage, setCheckinFeedbackMessage] = useState("");
  const [homeData, setHomeData] = useState(null);
  const [loadingHome, setLoadingHome] = useState(false);
  const [takingMed, setTakingMed] = useState(false);
  const [submittingCheckinQuestion, setSubmittingCheckinQuestion] = useState("");
  const [actionError, setActionError] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  const seniorId = useMemo(() => parseSeniorIdFromUser(user), [user]);

  const loadHome = useCallback(async () => {
    if (!seniorId) {
      setHomeData(null);
      return;
    }

    setLoadingHome(true);
    setActionError("");
    try {
      const data = await getSeniorHome({ seniorId });
      setHomeData(data);
      setSelectedCheckins({});
      setHoveredCheckinOptions({});
    } catch (error) {
      setActionError(error?.message || "Impossible de charger l'accueil.");
    } finally {
      setLoadingHome(false);
    }
  }, [seniorId]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  useEffect(() => {
    setSkippedCheckins({});
    setPendingAssistantCheckin(null);
    setCheckinFeedbackMessage("");
  }, [seniorId]);

  useEffect(() => {
    if (!checkinFeedbackMessage) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setCheckinFeedbackMessage("");
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [checkinFeedbackMessage]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const meds = Array.isArray(homeData?.medications)
    ? homeData.medications.map((med) => ({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        time: med.time,
        status: med.status,
      }))
    : [];

  const nextMed = homeData?.nextMedication
    ? {
        medicationId: homeData.nextMedication.medicationId,
        scheduledAt: homeData.nextMedication.scheduledAt,
        name: homeData.nextMedication.name,
        dosage: homeData.nextMedication.dosage,
        time: homeData.nextMedication.time,
        countdown: homeData.nextMedication.countdownText || "Maintenant",
      }
    : null;

  const seniorFirstName = formatDisplayFirstName(homeData?.senior?.name || user?.name, "Senior");
  const dailyQuestions = useMemo(() =>
    Array.isArray(homeData?.dailyQuestions) && homeData.dailyQuestions.length
      ? homeData.dailyQuestions.slice(0, 2)
      : (homeData?.dailyQuestion ? [homeData.dailyQuestion] : []),
  [homeData]);
  const activeDailyQuestion = useMemo(() => dailyQuestions
    .map((questionItem, questionIndex) => {
      const questionKey = String(questionItem?.question || `checkin-${questionIndex}`);
      const selectedAnswer = selectedCheckins[questionKey] || questionItem?.latestAnswer || "";

      return {
        questionItem,
        questionKey,
        selectedAnswer,
      };
    })
    .find(({ questionKey, selectedAnswer }) => !selectedAnswer && !skippedCheckins[questionKey]) || null,
  [dailyQuestions, selectedCheckins, skippedCheckins]);

  const appointment = homeData?.nextAppointment || null;
  const appointmentError = !loadingHome && !appointment && !homeData ? actionError : "";

  const hasMedicationsToday = meds.length > 0;
  const hasRemainingMedication = Boolean(nextMed?.medicationId);
  const remainingMedicationCount = meds.filter(
    (med) => String(med?.status || "").toLowerCase() !== "taken"
  ).length;
  const takenMedicationCount = Math.max(0, meds.length - remainingMedicationCount);
  const currentHour = new Date(nowTick).getHours();
  const homeGreeting = currentHour >= 18 || currentHour < 5 ? "Bonsoir" : "Bonjour";
  const nextMedicationTitle = nextMed
    ? nextMed.name
    : (loadingHome ? "Chargement..." : (hasMedicationsToday ? "Toutes les prises complétées" : "Aucun médicament prévu"));
  const nextMedicationDosage = normalizeDosage(nextMed?.dosage);
  const nextMedicationSubtitle = nextMed
    ? (nextMedicationDosage ? `${nextMedicationDosage} - ${nextMed.time}` : nextMed.time)
    : (loadingHome ? "Veuillez patienter..." : (hasMedicationsToday ? "Toutes les prises du jour sont enregistrées." : "Aucun traitement à prendre aujourd'hui."));
  const minutesUntilNextMedication = getMinutesUntil(nextMed?.scheduledAt, nowTick);
  const canShowTakeMedicationButton = hasRemainingMedication
    && (minutesUntilNextMedication == null || minutesUntilNextMedication <= 30);
  const takeButtonAvailabilityLabel = hasRemainingMedication && !canShowTakeMedicationButton
    ? getTakeActionAvailabilityLabel(nextMed?.scheduledAt)
    : "";
  const nextMedicationInfoText = hasRemainingMedication
    ? (loadingHome ? "Mise à jour des prises..." : takeButtonAvailabilityLabel)
    : "";
  const nextReturnLabel = getNextReturnLabel(meds);
  const nextMedicationCountdown = nextMed
    ? (formatSmartCountdown(nextMed.scheduledAt, nowTick) || nextMed.countdown)
    : (loadingHome ? "..." : (hasMedicationsToday ? (nextReturnLabel || "Demain") : "Aucun"));
  const heroProgressStep = !hasMedicationsToday
    ? 0
    : (remainingMedicationCount === 0 ? 3 : (takenMedicationCount > 0 ? 2 : 1));
  const heroProgressLabel = loadingHome
    ? "Mise à jour de votre journée..."
    : (!hasMedicationsToday
      ? "Aucun traitement prévu aujourd'hui."
      : `Prise ${takenMedicationCount} sur ${meds.length} aujourd'hui`);
  const homeSubtitle = hasMedicationsToday
    ? (remainingMedicationCount === 0
      ? "Toutes vos prises du jour sont complètes."
      : `Vous avez ${remainingMedicationCount} prise${remainingMedicationCount > 1 ? "s" : ""} restante${remainingMedicationCount > 1 ? "s" : ""} aujourd'hui.`)
    : (currentHour < 12
      ? "Prenons soin de votre journée, pas à pas."
      : "Aucune prise prévue aujourd'hui.");

  const handleTakeMedication = async () => {
    if (!seniorId || !nextMed?.medicationId || takingMed) {
      return;
    }
    setTakingMed(true);
    setActionError("");
    try {
      await markMedicationTaken({
        medicationId: nextMed.medicationId,
        seniorId,
        scheduledAt: nextMed.scheduledAt,
      });
      await loadHome();
    } catch (error) {
      setActionError(error?.message || "Impossible de confirmer la prise.");
    } finally {
      setTakingMed(false);
    }
  };

  const handleSubmitCheckin = async (questionValue, answerValue, options = {}) => {
    const {
      navigateToAssistant = false,
      showSavedConfirmation = false,
    } = options;

    if (!seniorId || !questionValue || !answerValue || submittingCheckinQuestion) {
      return;
    }
    setSubmittingCheckinQuestion(questionValue);
    setActionError("");
    if (!showSavedConfirmation) {
      setCheckinFeedbackMessage("");
    }
    setSkippedCheckins((current) => {
      const nextState = { ...current };
      delete nextState[questionValue];
      return nextState;
    });
    setSelectedCheckins((current) => ({ ...current, [questionValue]: answerValue }));
    try {
      await submitDailyCheckin({
        seniorId,
        question: questionValue,
        answer: answerValue,
      });
      setPendingAssistantCheckin(null);

      if (navigateToAssistant) {
        scheduleAssistantPrefill(SIDE_EFFECTS_ASSISTANT_MESSAGE);
        onNavigate("assistant");
        return;
      }

      if (showSavedConfirmation) {
        setCheckinFeedbackMessage(CHECKIN_SAVED_MESSAGE);
      }

      await loadHome();
    } catch (error) {
      setSelectedCheckins((current) => {
        const nextState = { ...current };
        delete nextState[questionValue];
        return nextState;
      });
      setActionError(error?.message || "Impossible d'envoyer la réponse.");
    } finally {
      setSubmittingCheckinQuestion("");
    }
  };

  const handleSkipCheckin = (questionValue) => {
    if (!questionValue || submittingCheckinQuestion) {
      return;
    }

    if (pendingAssistantCheckin?.questionValue === questionValue) {
      setPendingAssistantCheckin(null);
    }
    setHoveredCheckinOptions((current) => ({
      ...current,
      [questionValue]: "",
    }));
    setSkippedCheckins((current) => ({
      ...current,
      [questionValue]: true,
    }));
  };

  const handleCheckinOptionSelect = (questionValue, answerValue) => {
    if (!questionValue || !answerValue || submittingCheckinQuestion) {
      return;
    }

    setActionError("");
    setCheckinFeedbackMessage("");

    if (shouldConfirmAssistantEscalation(questionValue, answerValue)) {
      setHoveredCheckinOptions((current) => ({
        ...current,
        [questionValue]: "",
      }));
      setPendingAssistantCheckin({ questionValue, answerValue });
      return;
    }

    setPendingAssistantCheckin(null);
    handleSubmitCheckin(questionValue, answerValue);
  };

  return (
    <Phone>
      <div style={{ fontFamily: ACCUEIL_BODY_FONT }}>
        <div style={{ padding: "10px 18px 110px", color: T.navy }}>
        <div
          style={{
            animation: "fadeUp .45s both",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: T.teal50,
              color: T.primaryDark,
              fontSize: 12,
              fontWeight: 800,
              border: `1px solid ${T.teal100}`,
              marginBottom: 14,
            }}
          >
            <Icon.Heart />
            Mode Senior
          </div>

          <h1
            style={{
              fontFamily: ACCUEIL_TITLE_FONT,
              fontSize: "clamp(24px, 7vw, 28px)",
              lineHeight: 1.1,
              fontWeight: 400,
              letterSpacing: -0.5,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              columnGap: 8,
              rowGap: 2,
              maxWidth: "100%",
              marginBottom: 6,
            }}
          >
            <span style={{ whiteSpace: "nowrap" }}>{homeGreeting},</span>
            <span
              style={{
                minWidth: 0,
                maxWidth: "100%",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {seniorFirstName}
            </span>
          </h1>

          <p style={{ color: T.textLight, fontSize: 14, lineHeight: 1.6 }}>
            {homeSubtitle}
          </p>
          {loadingHome && (
            <p style={{ color: T.textLight, fontSize: 12, marginTop: 6 }}>
              Synchronisation...
            </p>
          )}
        </div>

        <div
          style={{
            animation: "fadeUp .45s .05s both",
            background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
            color: "white",
            borderRadius: 26,
            padding: 20,
            boxShadow: "0 16px 34px rgba(13,148,136,0.24)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.82, fontWeight: 700, marginBottom: 8 }}>
                Prochaine prise
              </div>
              <div style={{ fontFamily: ACCUEIL_TITLE_FONT, fontSize: 24, fontWeight: 400, lineHeight: 1.1 }}>
                {nextMedicationTitle}
              </div>
              <div style={{ fontSize: 15, opacity: 0.92, marginTop: 5 }}>
                {nextMedicationSubtitle}
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontWeight: 800,
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              {nextMedicationCountdown}
            </div>
          </div>

          {canShowTakeMedicationButton ? (
            <PrimaryBtn
              onClick={handleTakeMedication}
              loading={takingMed}
              disabled={!nextMed?.medicationId || loadingHome}
              style={{
                marginTop: 18,
                background: "white",
                color: T.primaryDark,
                border: "1.5px solid transparent",
                boxShadow: "none",
                fontFamily: ACCUEIL_BODY_FONT,
              }}
            >
              <Icon.Check />
              Je l'ai pris
            </PrimaryBtn>
          ) : nextMedicationInfoText ? (
            <div
              style={{
                marginTop: 18,
                borderRadius: 14,
                padding: "12px 14px",
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {nextMedicationInfoText}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "rgba(236,253,245,0.92)",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            <HeroProgressDots step={heroProgressStep} />
            <span>{heroProgressLabel}</span>
          </div>
        </div>

        <div
          style={{
            animation: "fadeUp .45s .1s both",
            background: "white",
            borderRadius: 22,
            padding: 18,
            border: `1.5px solid ${T.teal100}`,
            boxShadow: "0 8px 20px rgba(10,124,113,0.06)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                background: T.teal50,
                color: T.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon.Bot />
            </div>

            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.navy }}>{"Assistant sant\u00E9"}</div>
              <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>
                {"Bilan quotidien partag\u00E9 avec la famille"}
              </div>
            </div>
          </div>

          {checkinFeedbackMessage && (
            <div
              style={{
                marginBottom: 12,
                borderRadius: 14,
                padding: "10px 12px",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                color: "#047857",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.4,
              }}
            >
              {checkinFeedbackMessage}
            </div>
          )}

          {dailyQuestions.length ? (
            activeDailyQuestion ? (() => {
              const { questionItem, questionKey, selectedAnswer } = activeDailyQuestion;
              const options = Array.isArray(questionItem?.options) ? questionItem.options : [];
              const hoveredAnswer = hoveredCheckinOptions[questionKey] || "";
              const isQuestionAnswered = Boolean(questionItem?.latestAnswer);
              const questionButtonsDisabled = Boolean(submittingCheckinQuestion) || isQuestionAnswered;
              const showAssistantPrompt = pendingAssistantCheckin?.questionValue === questionKey;

              return (
                <div key={questionKey}>
                  <div
                    style={{
                      background: T.teal50,
                      borderRadius: 18,
                      padding: 14,
                      color: T.navy,
                      fontSize: 15,
                      fontWeight: 700,
                      lineHeight: 1.5,
                      marginBottom: 12,
                    }}
                  >
                    {questionItem?.question || ""}
                  </div>

                  {options.length ? (
                    showAssistantPrompt ? (
                      <div
                        style={{
                          background: "#F8FBFB",
                          border: "1px solid #D8E6E4",
                          borderRadius: 16,
                          padding: 14,
                        }}
                      >
                        <p
                          style={{
                            color: T.navy,
                            fontSize: 14,
                            fontWeight: 700,
                            lineHeight: 1.5,
                            marginBottom: 12,
                          }}
                        >
                          {"Souhaitez-vous en parler avec l'assistant sant\u00E9 ?"}
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              handleSubmitCheckin(questionKey, pendingAssistantCheckin.answerValue, {
                                navigateToAssistant: true,
                              });
                            }}
                            disabled={questionButtonsDisabled}
                            style={{
                              fontFamily: ACCUEIL_BODY_FONT,
                              border: `2px solid ${T.primary}`,
                              background: "#E9F7F5",
                              color: T.primaryDark,
                              borderRadius: 14,
                              minHeight: 56,
                              width: "100%",
                              padding: "10px 12px",
                              fontSize: 15,
                              fontWeight: 800,
                              lineHeight: 1.1,
                              cursor: questionButtonsDisabled ? "not-allowed" : "pointer",
                              transition: "all 0.18s ease",
                              ...(questionButtonsDisabled ? { opacity: 0.6 } : {}),
                            }}
                          >
                            Oui
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSubmitCheckin(questionKey, pendingAssistantCheckin.answerValue, {
                                showSavedConfirmation: true,
                              });
                            }}
                            disabled={questionButtonsDisabled}
                            style={{
                              fontFamily: ACCUEIL_BODY_FONT,
                              border: "2px solid #D8E6E4",
                              background: "#F8FBFB",
                              color: T.primaryDark,
                              borderRadius: 14,
                              minHeight: 56,
                              width: "100%",
                              padding: "10px 12px",
                              fontSize: 15,
                              fontWeight: 800,
                              lineHeight: 1.1,
                              cursor: questionButtonsDisabled ? "not-allowed" : "pointer",
                              transition: "all 0.18s ease",
                              ...(questionButtonsDisabled ? { opacity: 0.6 } : {}),
                            }}
                          >
                            Non
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 8 }}>
                          {options.map((answer) => {
                            const variant = getCheckinOptionVariant(questionKey, answer);
                            const isActive = selectedAnswer === answer || (!selectedAnswer && hoveredAnswer === answer);
                            const answerLabel = getCheckinOptionLabel(questionKey, answer);

                            return (
                              <button
                                key={`${questionKey}-${answer}`}
                                type="button"
                                onClick={() => {
                                  if (questionButtonsDisabled) return;
                                  handleCheckinOptionSelect(questionKey, answer);
                                }}
                                onMouseEnter={() => {
                                  if (!selectedAnswer && !questionButtonsDisabled) {
                                    setHoveredCheckinOptions((current) => ({
                                      ...current,
                                      [questionKey]: answer,
                                    }));
                                  }
                                }}
                                onMouseLeave={() => {
                                  setHoveredCheckinOptions((current) => ({
                                    ...current,
                                    [questionKey]: "",
                                  }));
                                }}
                                style={{
                                  fontFamily: ACCUEIL_BODY_FONT,
                                  border: `2px solid ${isActive ? T.primary : "#d8e6e4"}`,
                                  background: isActive ? "#e9f7f5" : "#f8fbfb",
                                  color: T.primaryDark,
                                  borderRadius: 14,
                                  minHeight: 82,
                                  width: "100%",
                                  padding: "10px 8px 8px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 8,
                                  fontSize: 15,
                                  fontWeight: 800,
                                  lineHeight: 1.1,
                                  cursor: questionButtonsDisabled ? "not-allowed" : "pointer",
                                  transition: "all 0.18s ease",
                                  ...(questionButtonsDisabled ? { opacity: 0.6, pointerEvents: "none" } : {}),
                                }}
                              >
                                <CheckinBars variant={variant} active={isActive} />
                                <span style={{ fontSize: 15, fontWeight: 800 }}>{answerLabel}</span>
                              </button>
                            );
                          })}
                        </div>

                        {!questionButtonsDisabled && (
                          <button
                            type="button"
                            onClick={() => handleSkipCheckin(questionKey)}
                            style={{
                              marginTop: 10,
                              padding: 0,
                              border: "none",
                              background: "none",
                              color: "#91A8A3",
                              fontFamily: ACCUEIL_BODY_FONT,
                              fontSize: 12,
                              fontWeight: 600,
                              lineHeight: 1.4,
                              cursor: "pointer",
                            }}
                          >
                            Passer
                          </button>
                        )}
                      </>
                    )
                  ) : null}
                </div>
              );
            })() : (
              <p style={{ fontSize: 12, color: T.textLight, marginBottom: 4 }}>
                {loadingHome ? "Chargement..." : "Aucune question disponible pour le moment."}
              </p>
            )
          ) : (
            <p style={{ fontSize: 12, color: T.textLight, marginBottom: 4 }}>
              {loadingHome ? "Chargement..." : "Aucune question disponible pour le moment."}
            </p>
          )}

        </div>

        <div style={{ animation: "fadeUp .45s .15s both", marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2 style={{ fontFamily: ACCUEIL_TITLE_FONT, fontSize: 18, fontWeight: 400, color: T.navy }}>
              Traitement du jour
            </h2>
            <span style={{ fontSize: 12, color: T.textLight, fontWeight: 700 }}>
              {loadingHome && !homeData ? "..." : `${meds.length} m\u00E9dicaments`}
            </span>
          </div>

          {loadingHome && !homeData && (
            <p style={{ fontSize: 12, color: T.textLight }}>
              Chargement du traitement...
            </p>
          )}
          {!loadingHome && !meds.length && (
            <p style={{ fontSize: 12, color: T.textLight }}>
              {"Aucun m\u00E9dicament actif pour aujourd'hui."}
            </p>
          )}
          {!!meds.length && (
            <div
              style={{
                background: "white",
                borderRadius: 20,
                border: `1.5px solid ${T.teal100}`,
                boxShadow: "0 8px 20px rgba(10,124,113,0.06)",
                overflow: "hidden",
              }}
            >
              {meds.map((med, index) => {
                const statusMeta = getMedicationStatusMeta(med?.status);
                const dosageLabel = normalizeDosage(med?.dosage);
                return (
                  <div
                    key={med.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 14px",
                      borderBottom: index < meds.length - 1 ? "1px solid #EBF7F3" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        background: T.teal50,
                        color: T.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon.Pill active />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>
                        {med.name}
                      </div>
                      <div style={{ fontSize: 12, color: T.textLight, marginTop: 3 }}>
                        {dosageLabel ? <>{dosageLabel}{" \u00B7 "}{med.time}</> : med.time}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: statusMeta.bg,
                        color: statusMeta.color,
                        fontSize: 11,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AppointmentCard appointment={appointment} loading={loadingHome} error={appointmentError} />

        {actionError && actionError !== appointmentError && (
          <p style={{ color: T.danger, fontSize: 12, fontWeight: 700, marginTop: 8 }}>
            {actionError}
          </p>
        )}
        </div>

        <BottomNav current="dashboard" onNavigate={onNavigate} />
      </div>
    </Phone>
  );
}

