import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../../components/icons/Icons";
import { Phone } from "../../components/ui/Phone";
import { BottomNav } from "../../components/senior/BottomNav";
import {
  getSeniorAssistantHistory,
  parseSeniorIdFromUser,
  sendSeniorAssistantMessage,
  triggerSos,
} from "../../services/homeApi";
import { formatDisplayFirstName } from "../../utils/nameFormat";

const PAGE_BODY_FONT = "'DM Sans', sans-serif";
const ASSISTANT_HEADER_FONT = PAGE_BODY_FONT;

function Bubble({ from = "bot", text, time }) {
  const isBot = from === "bot";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isBot ? "flex-start" : "flex-end",
        animation: "fadeUp .25s ease both",
      }}
    >
      <div style={{ maxWidth: "84%", display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            padding: "14px 15px",
            borderRadius: isBot ? "18px 18px 18px 6px" : "18px 18px 6px 18px",
            background: isBot ? "white" : `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
            color: isBot ? T.navy : "white",
            border: isBot ? `1.5px solid ${T.teal100}` : "none",
            boxShadow: isBot ? "0 8px 18px rgba(10,124,113,0.06)" : "0 10px 22px rgba(13,148,136,0.20)",
            fontSize: 15,
            lineHeight: 1.5,
            fontWeight: isBot ? 600 : 700,
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
        </div>

        <span
          style={{
            fontSize: 11,
            color: T.textLight,
            fontWeight: 700,
            alignSelf: isBot ? "flex-start" : "flex-end",
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          {time}
        </span>
      </div>
    </div>
  );
}

function SuggestionChip({ children, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 999,
        border: `1.5px solid ${T.teal100}`,
        background: "white",
        color: T.primaryDark,
        fontSize: 13,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: "0 4px 12px rgba(13,148,136,0.08)",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp .2s ease both" }}>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: "18px 18px 18px 6px",
          background: "white",
          border: `1.5px solid ${T.teal100}`,
          display: "flex",
          gap: 5,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: T.primary,
              animation: `typing 1.2s ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const INITIAL_SUGGESTIONS = [
  "Je vais bien",
  "Je suis fatigué(e)",
  "J'ai mal quelque part",
  "Mes médicaments",
  "Mon rendez-vous",
  "Je veux parler",
];
const QUICK_REPLY_LIMIT = 3;

function formatNowTime() {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatApiTime(value) {
  if (!value) return formatNowTime();
  const raw = String(value).replace(" ", "T");
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (raw.length >= 16) {
    return raw.slice(11, 16);
  }
  return formatNowTime();
}

function normalizeSender(sender) {
  const normalized = String(sender || "").trim().toLowerCase();
  if (normalized === "senior" || normalized === "user") return "user";
  return "bot";
}

function mapApiMessages(apiMessages = []) {
  if (!Array.isArray(apiMessages)) return [];
  return apiMessages
    .filter((message) => message && typeof message === "object")
    .map((message, index) => ({
      id: message.id ?? `message-${index}`,
      from: normalizeSender(message.sender),
      text: String(message.message || "").trim(),
      time: formatApiTime(message.createdAt),
    }))
    .filter((message) => Boolean(message.text));
}

function buildWelcomeMessage(name) {
  return `Bonjour ${formatDisplayFirstName(name, "cher(e) ami(e)")}, je suis avec vous. Comment vous sentez-vous aujourd'hui ?`;
}

function resolveQuickReplies(list, fallback = INITIAL_SUGGESTIONS, options = {}) {
  const { exclude = [], limit = QUICK_REPLY_LIMIT } = options;
  const blocked = new Set(
    (Array.isArray(exclude) ? exclude : [exclude])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const preferred = Array.isArray(list) ? list : [];
  const backup = Array.isArray(fallback) ? fallback : [];
  const pool = [...preferred, ...backup, ...INITIAL_SUGGESTIONS];
  const picked = [];
  const seen = new Set();

  for (const raw of pool) {
    const candidate = String(raw || "").trim();
    if (!candidate) continue;

    const key = candidate.toLowerCase();
    if (blocked.has(key) || seen.has(key)) continue;

    seen.add(key);
    picked.push(candidate);
    if (picked.length >= limit) break;
  }

  return picked;
}

function getFallbackSuggestions(text) {
  const normalized = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("fatigu")) return ["Un peu de repos", "J'ai aussi mal", "Parler un peu"];
  if (normalized.includes("mal") || normalized.includes("douleur")) return ["J'ai mal au dos", "J'ai mal à la tête", "C'est supportable"];
  if (normalized.includes("medicament")) return ["Rappel prise", "Je l'ai pris", "Je n'ai pas pris"];
  if (normalized.includes("rendez") || normalized.includes("rdv")) return ["Rappeler la date", "Ajouter un rappel", "Merci"];
  return INITIAL_SUGGESTIONS;
}

function isSosQuickReply(text) {
  const normalized = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized.includes("sos") || normalized.includes("declencher sos") || normalized.includes("alerte");
}

function mapAssistantErrorMessage(error) {
  const raw = String(error?.message || "");
  if (/404/i.test(raw) || /not found/i.test(raw)) {
    return "Service assistant indisponible pour le moment. Redémarrez le backend pour activer les nouveaux endpoints.";
  }
  return raw || "Impossible de contacter l'assistant.";
}

export default function ElderAssistant({ onNavigate = () => {}, user = null }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quickReplies, setQuickReplies] = useState(resolveQuickReplies(INITIAL_SUGGESTIONS));
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [assistantError, setAssistantError] = useState("");

  const scrollRef = useRef(null);
  const historyRequestRef = useRef(0);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");

  const effectiveUser = useMemo(() => {
    if (user) return user;
    try {
      const raw = localStorage.getItem("cura_auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }, [user]);

  const seniorId = useMemo(() => parseSeniorIdFromUser(effectiveUser), [effectiveUser]);

  const loadHistory = useCallback(async () => {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;

    if (!seniorId) {
      if (requestId === historyRequestRef.current) {
        setAssistantError("Session senior introuvable. Veuillez vous reconnecter.");
        setMessages([
          {
            id: "fallback-welcome",
            from: "bot",
            text: buildWelcomeMessage(effectiveUser?.name),
            time: formatNowTime(),
          },
        ]);
        setQuickReplies(resolveQuickReplies(INITIAL_SUGGESTIONS));
        setShowQuickReplies(true);
      }
      return;
    }

    if (requestId === historyRequestRef.current) {
      setLoadingHistory(true);
      setAssistantError("");
    }

    try {
      const data = await getSeniorAssistantHistory({ seniorId });
      if (requestId !== historyRequestRef.current) return;

      const conversation = data?.conversation || {};
      const mappedMessages = mapApiMessages(conversation?.messages);
      const nextMessages = mappedMessages.length
        ? mappedMessages
        : [{
            id: "welcome",
            from: "bot",
            text: buildWelcomeMessage(effectiveUser?.name),
            time: formatNowTime(),
          }];

      setMessages(nextMessages);
      setQuickReplies(resolveQuickReplies(conversation?.quickReplies));
      setShowQuickReplies(true);
    } catch (error) {
      if (requestId !== historyRequestRef.current) return;
      setAssistantError(mapAssistantErrorMessage(error));
      setMessages((prev) => prev.length ? prev : [{
        id: "fallback-error-welcome",
        from: "bot",
        text: buildWelcomeMessage(effectiveUser?.name),
        time: formatNowTime(),
      }]);
      setQuickReplies(resolveQuickReplies(INITIAL_SUGGESTIONS));
      setShowQuickReplies(true);
    } finally {
      if (requestId === historyRequestRef.current) {
        setLoadingHistory(false);
      }
    }
  }, [effectiveUser?.name, seniorId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = String(event.results[index][0]?.transcript || "").trim();
        if (!transcript) continue;
        if (event.results[index].isFinal) {
          finalChunk = `${finalChunk} ${transcript}`.trim();
        } else {
          interimChunk = `${interimChunk} ${transcript}`.trim();
        }
      }

      if (finalChunk) {
        transcriptRef.current = `${transcriptRef.current} ${finalChunk}`.trim();
      }

      const merged = `${transcriptRef.current} ${interimChunk}`.trim();
      setInput(merged);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (_error) {
        // No-op cleanup for browsers that throw if not actively listening.
      }
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing, loadingHistory]);

  const handleMicToggle = () => {
    if (sendingMessage || loadingHistory) return;

    const recognition = recognitionRef.current;
    if (!recognition) {
      setAssistantError("Reconnaissance vocale non supportée sur ce navigateur.");
      return;
    }

    if (isListening) {
      try {
        recognition.stop();
      } catch (_error) {
        // Ignore stop races when recognition already ended.
      }
      setIsListening(false);
      return;
    }

    transcriptRef.current = input.trim();
    setAssistantError("");

    try {
      recognition.start();
      setIsListening(true);
    } catch (_error) {
      setIsListening(false);
      setAssistantError("Impossible de démarrer le micro. Vérifiez les permissions.");
    }
  };

  const handleSend = async (forcedText, options = {}) => {
    const { fromQuickReply = false } = options;
    const text = (forcedText ?? input).trim();
    if (!text || sendingMessage || loadingHistory) return;

    if (!seniorId) {
      setAssistantError("Session senior introuvable. Veuillez vous reconnecter.");
      return;
    }

    if (fromQuickReply) {
      setShowQuickReplies(false);
      setQuickReplies([]);
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_error) {
        // Ignore stop races when recognition already ended.
      }
      setIsListening(false);
    }

    if (!forcedText) setInput("");
    setAssistantError("");

    const optimisticMessage = {
      id: `local-user-${Date.now()}`,
      from: "user",
      text,
      time: formatNowTime(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTyping(true);
    setSendingMessage(true);

    try {
      const data = await sendSeniorAssistantMessage({
        seniorId,
        message: text,
      });

      const conversation = data?.conversation || {};
      const mappedMessages = mapApiMessages(conversation?.messages);
      if (mappedMessages.length) {
        setMessages(mappedMessages);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-bot-${Date.now()}`,
            from: "bot",
            text: conversation?.latestBotMessage?.message || "Merci, je suis là pour vous.",
            time: formatApiTime(conversation?.latestBotMessage?.createdAt),
          },
        ]);
      }
      const refreshedReplies = resolveQuickReplies(
        conversation?.quickReplies,
        getFallbackSuggestions(text),
        { exclude: [text], limit: QUICK_REPLY_LIMIT }
      );
      setQuickReplies(refreshedReplies);
      setShowQuickReplies(refreshedReplies.length > 0);
    } catch (error) {
      setAssistantError(mapAssistantErrorMessage(error));
      const fallbackReplies = resolveQuickReplies(
        getFallbackSuggestions(text),
        INITIAL_SUGGESTIONS,
        { exclude: [text], limit: QUICK_REPLY_LIMIT }
      );
      setQuickReplies(fallbackReplies);
      setShowQuickReplies(fallbackReplies.length > 0);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-bot-error-${Date.now()}`,
          from: "bot",
          text: "Je rencontre un souci technique. Réessayons dans quelques instants.",
          time: formatNowTime(),
        },
      ]);
    } finally {
      setTyping(false);
      setSendingMessage(false);
    }
  };

  const handleQuickReplyClick = async (item) => {
    if (!isSosQuickReply(item)) {
      handleSend(item, { fromQuickReply: true });
      return;
    }

    if (sendingMessage || loadingHistory) return;

    if (!seniorId) {
      setAssistantError("Session senior introuvable. Veuillez vous reconnecter.");
      return;
    }

    setShowQuickReplies(false);
    setQuickReplies([]);

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_error) {
        // Ignore stop races when recognition already ended.
      }
      setIsListening(false);
    }

    setAssistantError("");
    setSendingMessage(true);

    try {
      await triggerSos({
        seniorId,
        comment: String(item || "").trim() || "Alerte déclenchée depuis l'assistant.",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `local-bot-sos-${Date.now()}`,
          from: "bot",
          text: "Alerte SOS envoy\u00E9e. Votre famille a \u00E9t\u00E9 pr\u00E9venue.",
          time: formatNowTime(),
        },
      ]);
    } catch (error) {
      setAssistantError(error?.message || "Impossible d'envoyer l'alerte SOS.");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <Phone>
      <div style={{ padding: "12px 14px 110px", color: T.navy, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ animation: "fadeUp .42s both", marginBottom: 8 }}>
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
              marginBottom: 10,
            }}
          >
            <Icon.ArrowLeft />
            Retour
          </button>
        </div>

        <div
          style={{
            animation: "fadeUp .42s .02s both",
            background: "white",
            borderRadius: 16,
            border: `1.5px solid ${T.teal100}`,
            boxShadow: "0 8px 20px rgba(10,124,113,0.06)",
            padding: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `linear-gradient(160deg, ${T.primary}, ${T.primaryDark})`,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon.Bot />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: ASSISTANT_HEADER_FONT,
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: -0.3,
                color: T.navy,
                lineHeight: 1.05,
              }}
            >
              Assistant santé
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: T.success }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: T.success,
                  boxShadow: "0 0 0 2px rgba(34,197,94,0.15)",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 800 }}>
                {loadingHistory
                  ? "Synchronisation..."
                  : (sendingMessage
                    ? "Réponse en cours..."
                    : (isListening ? "Écoute..." : "En ligne"))}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            animation: "scaleIn .35s .08s both",
            background: `linear-gradient(180deg, ${T.teal50}, #f8fffd)`,
            borderRadius: 22,
            border: `1.5px solid ${T.teal100}`,
            padding: 12,
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {assistantError && (
            <div
              style={{
                marginBottom: 10,
                borderRadius: 12,
                padding: "9px 10px",
                fontSize: 12,
                fontWeight: 700,
                background: T.dangerLight,
                border: "1px solid rgba(239,68,68,0.25)",
                color: T.danger,
              }}
            >
              {assistantError}
            </div>
          )}

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              paddingBottom: 6,
            }}
          >
            {messages.map((message) => (
              <Bubble key={message.id} from={message.from} text={message.text} time={message.time} />
            ))}
            {typing && <TypingIndicator />}
          </div>

          {showQuickReplies && quickReplies.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  color: T.textLight,
                  fontWeight: 800,
                  marginBottom: 8,
                  paddingLeft: 2,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Réponses rapides
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {quickReplies.map((item) => (
                  <SuggestionChip
                    key={item}
                    disabled={sendingMessage || loadingHistory}
                    onClick={() => handleQuickReplyClick(item)}
                  >
                    {item}
                  </SuggestionChip>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 12,
              background: "white",
              borderRadius: 18,
              border: `1.5px solid ${T.teal100}`,
              padding: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              onClick={handleMicToggle}
              disabled={sendingMessage || loadingHistory}
              title={isListening ? "Arrêter l'écoute" : "Activer le micro"}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                border: "none",
                background: isListening ? T.primary : T.teal50,
                color: isListening ? "white" : T.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                cursor: sendingMessage || loadingHistory ? "not-allowed" : "pointer",
                opacity: sendingMessage || loadingHistory ? 0.7 : 1,
                boxShadow: isListening ? "0 8px 18px rgba(13,148,136,0.24)" : "none",
              }}
            >
              <Icon.Mic />
            </button>

            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Écrivez un message..."
              disabled={sendingMessage || loadingHistory}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 15,
                color: T.navy,
                background: "transparent",
                fontFamily: "inherit",
              }}
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sendingMessage || loadingHistory}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border: "none",
                background: input.trim() && !sendingMessage && !loadingHistory
                  ? `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`
                  : T.teal100,
                color: input.trim() && !sendingMessage && !loadingHistory ? "white" : T.textLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                cursor: !input.trim() || sendingMessage || loadingHistory ? "not-allowed" : "pointer",
                boxShadow: input.trim() && !sendingMessage && !loadingHistory
                  ? "0 8px 18px rgba(13,148,136,0.24)"
                  : "none",
              }}
            >
              <Icon.Send />
            </button>
          </div>
        </div>
      </div>

      <BottomNav current="assistant" onNavigate={onNavigate} />
    </Phone>
  );
}
