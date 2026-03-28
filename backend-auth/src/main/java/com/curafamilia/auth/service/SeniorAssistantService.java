package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.AssistantChatRequest;
import com.curafamilia.auth.dto.AssistantConversationResponse;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.repository.SeniorAssistantRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.json.bind.Jsonb;
import jakarta.json.bind.JsonbBuilder;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.text.Normalizer;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SeniorAssistantService {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter APPOINTMENT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final int MAX_MESSAGE_LENGTH = 1000;
    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{M}+");
    private static final Pattern NON_WORD_PATTERN = Pattern.compile("[^a-z0-9' ]");
    private static final Pattern MULTI_SPACE_PATTERN = Pattern.compile("\\s+");
    private static final Pattern PAIN_SCORE_PATTERN = Pattern.compile("\\b(10|[0-9])\\b");
    private static final Pattern TUTOIEMENT_PATTERN = Pattern.compile("(^|\\s)(tu|toi|ton|ta|tes|te|t'es|t'[a-z]+)(?=\\s|$)");

    private static final List<String> DEFAULT_QUICK_REPLIES = List.of(
            "Je vais bien",
            "Je suis fatigue(e)",
            "J'ai mal quelque part",
            "Mes medicaments",
            "Mon rendez-vous",
            "Je veux parler"
    );

    public AssistantConversationResponse getHistory(Long seniorId, String dateValue) {
        validateSeniorId(seniorId);
        LocalDate targetDate = parseDateOrToday(dateValue);

        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            SeniorAssistantRepository repository = new SeniorAssistantRepository(entityManager);
            ensureSeniorExists(repository, seniorId);

            Optional<SeniorAssistantRepository.SessionProjection> session = repository.findSessionByDate(seniorId, targetDate);
            List<SeniorAssistantRepository.MessageProjection> messages = session
                    .map(found -> repository.findMessagesBySession(found.getId()))
                    .orElse(List.of());

            String latestIntent = findLatestUserIntent(messages)
                    .orElse("general");

            AssistantConversationResponse.ConversationData conversation = new AssistantConversationResponse.ConversationData(
                    seniorId,
                    session.map(SeniorAssistantRepository.SessionProjection::getId).orElse(null),
                    targetDate.format(DATE_FORMATTER),
                    session.map(SeniorAssistantRepository.SessionProjection::getStatus).orElse("open"),
                    mapMessage(findLatestMessageBySender(messages, "senior").orElse(null)),
                    mapMessage(findLatestMessageBySender(messages, "bot").orElse(null)),
                    mapMessages(messages),
                    buildQuickReplies(latestIntent, false),
                    null
            );

            return new AssistantConversationResponse("Historique charge.", conversation);
        } finally {
            entityManager.close();
        }
    }

    public AssistantConversationResponse chat(AssistantChatRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        validateSeniorId(request.getSeniorId());
        String userText = normalizeUserMessage(request.getMessage());
        LocalDate targetDate = parseDateOrToday(request.getDate());

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        LocalDateTime now = LocalDateTime.now();

        try {
            SeniorAssistantRepository repository = new SeniorAssistantRepository(entityManager);
            SeniorAssistantRepository.SeniorProjection senior = ensureSeniorExists(repository, request.getSeniorId());

            transaction.begin();
            Long sessionId = repository.upsertOpenSessionAndGetId(request.getSeniorId(), targetDate, now);

            List<SeniorAssistantRepository.MessageProjection> messagesBeforeUser = repository.findMessagesBySession(sessionId);
            ConversationContext contextBeforeUser = analyzeConversationContext(messagesBeforeUser);

            String userIntent = detectIntent(userText, contextBeforeUser);
            Long userMessageId = repository.insertMessageAndGetId(sessionId, "senior", userText, userIntent, now);

            Optional<SeniorAssistantRepository.MedicationHintProjection> nextMedication =
                    repository.findNextMedication(request.getSeniorId(), now.toLocalTime());
            Optional<SeniorAssistantRepository.AppointmentHintProjection> nextAppointment =
                    repository.findNextAppointment(request.getSeniorId(), now);

            List<SeniorAssistantRepository.MessageProjection> messagesAfterUser = repository.findMessagesBySession(sessionId);
            ConversationContext contextAfterUser = analyzeConversationContext(messagesAfterUser);

            String botReply = buildWarmReply(
                    senior.getName(),
                    userText,
                    userIntent,
                    contextAfterUser,
                    messagesAfterUser,
                    nextMedication,
                    nextAppointment
            );
            Long botMessageId = repository.insertMessageAndGetId(
                    sessionId,
                    "bot",
                    botReply,
                    mapBotIntent(userIntent),
                    LocalDateTime.now()
            );

            List<SeniorAssistantRepository.MessageProjection> allMessages = repository.findMessagesBySession(sessionId);

            transaction.commit();

            SeniorAssistantRepository.SessionProjection session = repository
                    .findSessionByDate(request.getSeniorId(), targetDate)
                    .orElse(new SeniorAssistantRepository.SessionProjection(
                            sessionId,
                            request.getSeniorId(),
                            targetDate,
                            "open",
                            now,
                            null
                    ));

            AssistantConversationResponse.ConversationData conversation = new AssistantConversationResponse.ConversationData(
                    request.getSeniorId(),
                    session.getId(),
                    targetDate.format(DATE_FORMATTER),
                    normalizeStatus(session.getStatus()),
                    mapMessage(repository.findMessageById(userMessageId).orElse(null)),
                    mapMessage(repository.findMessageById(botMessageId).orElse(null)),
                    mapMessages(allMessages),
                    buildQuickReplies(userIntent, false),
                    null
            );

            return new AssistantConversationResponse("Message enregistre.", conversation);
        } catch (ApiException exception) {
            rollback(transaction);
            throw exception;
        } catch (Exception exception) {
            rollback(transaction);
            throw exception;
        } finally {
            entityManager.close();
        }
    }

    private SeniorAssistantRepository.SeniorProjection ensureSeniorExists(SeniorAssistantRepository repository, Long seniorId) {
        return repository.findSenior(seniorId)
                .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Senior not found."));
    }

    private void validateSeniorId(Long seniorId) {
        if (seniorId == null || seniorId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "seniorId is required.");
        }
    }

    private String normalizeUserMessage(String message) {
        if (message == null || message.isBlank()) {
            throw new ApiException(Response.Status.BAD_REQUEST, "message is required.");
        }
        String normalized = message.trim();
        if (normalized.length() > MAX_MESSAGE_LENGTH) {
            throw new ApiException(Response.Status.BAD_REQUEST, "message is too long (max 1000 chars).");
        }
        return normalized;
    }

    private LocalDate parseDateOrToday(String dateValue) {
        if (dateValue == null || dateValue.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(dateValue.trim(), DATE_FORMATTER);
        } catch (DateTimeParseException exception) {
            throw new ApiException(Response.Status.BAD_REQUEST, "date must use YYYY-MM-DD format.");
        }
    }

    private String detectIntent(String text, ConversationContext context) {
        String normalized = normalizeForMatching(text);
        boolean medicationMentioned = containsAny(normalized, "medicament", "prise", "pilule", "cachet", "traitement", "ordonnance")
                || hasAnyStem(normalized, "medic", "medoc", "cache", "pilul", "compri", "trait");
        boolean appointmentMentioned = containsAny(normalized, "rendez", "rdv", "docteur", "medecin", "consultation", "visite")
                || hasAnyStem(normalized, "rendez", "docte", "medec", "consul", "visi", "control");
        boolean painMentioned = containsAny(normalized, "douleur", "j'ai mal", "j ai mal", "mal au", "migraine", "tete", "dos", "poitrine", "thorac")
                || hasAnyStem(normalized, "doule", "migra", "bobo", "lomb");
        boolean sosMentioned = containsAny(
                normalized,
                "sos",
                "alerte",
                "alerter",
                "declencher sos",
                "bouton sos",
                "faire une alerte",
                "faire un alert",
                "envoyer une alerte",
                "secours",
                "a l aide",
                "appeler un proche",
                "prevenir un proche",
                "prevenir ma famille",
                "appeler ma famille"
        ) || hasAnyStem(normalized, "alert", "secour");
        boolean wellbeingMentioned = containsAny(normalized,
                "je vais bien", "ca va", "tout va bien", "je me sens bien",
                "je suis content", "je suis contente", "content aujourd hui", "contente aujourd hui",
                "je suis heureux", "je suis heureuse", "heureux aujourd hui", "heureuse aujourd hui",
                "je vais mieux", "ca va mieux", "je me sens mieux");
        boolean acknowledgement = isAcknowledgement(normalized);
        boolean helpFollowup = containsAny(normalized, "comment", "quoi faire", "que faire", "et apres", "ensuite", "apres", "et maintenant");
        boolean sosHelpRequested = sosMentioned && (
                helpFollowup
                        || containsAny(
                        normalized,
                        "je veux",
                        "je voudrais",
                        "voudrais",
                        "peux tu",
                        "pouvez vous",
                        "je ne sais pas",
                        "j ne sais pas",
                        "je sais pas",
                        "sais pas",
                        "aide moi",
                        "aidez moi",
                        "utiliser",
                        "declencher"
                )
        );

        if (containsAny(
                normalized,
                "douleur thorac",
                "respire mal",
                "essouff",
                "etouff",
                "malaise",
                "chute",
                "urgence",
                "saigne",
                "sang",
                "perdu connaissance",
                "inconscient",
                "vomissement",
                "vomis",
                "fievre tres"
        )) {
            return "urgent";
        }
        if ((context.recentHighPainSignal() || painMentioned)
                && containsAny(normalized, "toujours mal", "encore mal", "pire", "augmente", "pas mieux")) {
            return "urgent";
        }
        if (sosHelpRequested) {
            return "sos_help";
        }
        if ((medicationMentioned || context.recentMedicationTopic())
                && containsAny(normalized, "j ai pris", "je l ai pris", "prise faite", "c est fait", "fait")) {
            return "medication_taken";
        }
        if ((medicationMentioned || context.recentMedicationTopic())
                && containsAny(normalized, "j ai oublie", "oublie", "pas pris", "rate", "pas encore pris")) {
            return "medication_missed";
        }
        if (containsAny(normalized, "j ai peur", "je suis inquiet", "inquiet", "angoisse", "stress", "stresse")) {
            return "anxiety_support";
        }
        if (containsAny(normalized, "merci", "d accord merci", "super merci")) {
            return "gratitude";
        }
        if (helpFollowup) {
            if (context.recentPainTopic() || context.lastBotAskedPainLocation()
                    || context.lastBotAskedPainIntensity() || context.lastBotAskedPainDuration()) {
                return "pain_followup";
            }
            if (context.recentMedicationTopic()) {
                return "medication_followup";
            }
            if (context.recentAppointmentTopic()) {
                return "appointment_followup";
            }
            return "followup";
        }
        if (acknowledgement) {
            if (context.recentPainTopic()) {
                return "pain_followup";
            }
            if (context.recentMedicationTopic()) {
                return "medication_followup";
            }
            if (context.recentAppointmentTopic()) {
                return "appointment_followup";
            }
        }
        if (containsAny(normalized, "je ne sais pas", "j ne sais pas", "sais pas", "aucune idee", "je sais pas")) {
            if (context.recentPainTopic() || context.lastBotAskedPainLocation()
                    || context.lastBotAskedPainIntensity() || context.lastBotAskedPainDuration()) {
                return "pain_followup";
            }
            if (context.recentMedicationTopic()) {
                return "medication_followup";
            }
            if (context.recentAppointmentTopic()) {
                return "appointment_followup";
            }
        }
        if (medicationMentioned) {
            return "medication";
        }
        if (appointmentMentioned) {
            return "appointment";
        }
        if (painMentioned) {
            return "pain";
        }
        if (containsAny(normalized, "fatigue", "fatiguee", "fatigue", "epuise", "epuisee")) {
            return "fatigue";
        }
        if (containsAny(normalized, "seul", "seule", "triste", "angoisse", "parler", "besoin de compagnie")) {
            return "emotional_support";
        }
        if (containsAny(normalized, "bonjour", "salut", "bonsoir", "hello", "hi", "hey", "coucou")) {
            return "greeting";
        }
        if (wellbeingMentioned) {
            return "wellbeing";
        }
        if (context.recentPainTopic() && (containsPainLocation(normalized)
                || extractPainScore(normalized).isPresent()
                || containsDurationAnswer(normalized))) {
            return "pain_followup";
        }
        if (isVeryShortMessage(normalized) && context.recentGeneralTurns() >= 2) {
            return "clarify_scope";
        }
        return "general";
    }

    private String mapBotIntent(String userIntent) {
        return switch (userIntent) {
            case "urgent" -> "safety_guidance";
            case "sos_help" -> "safety_guidance";
            case "medication", "medication_followup", "medication_taken", "medication_missed" -> "medication_support";
            case "appointment", "appointment_followup" -> "appointment_support";
            case "pain", "pain_followup", "fatigue" -> "comfort_check";
            case "emotional_support", "anxiety_support", "gratitude" -> "emotional_support";
            case "clarify_scope" -> "general_support";
            default -> "general_support";
        };
    }

    private String buildWarmReply(
            String seniorName,
            String userText,
            String intent,
            ConversationContext context,
            List<SeniorAssistantRepository.MessageProjection> recentMessages,
            Optional<SeniorAssistantRepository.MedicationHintProjection> nextMedication,
            Optional<SeniorAssistantRepository.AppointmentHintProjection> nextAppointment) {
        String normalizedUserText = normalizeForMatching(userText);
        boolean topicShifted = isTopicShiftMessage(normalizedUserText, intent, context);
        String aiContext = buildAiConversationContext(
                seniorName,
                userText,
                intent,
                context,
                topicShifted,
                nextMedication,
                nextAppointment
        );
        List<String> fallbackReplies = buildAiFallbackReplies(
                seniorName,
                userText,
                intent,
                context,
                topicShifted,
                nextMedication,
                nextAppointment
        );

        try {
            return callClaudeApi(recentMessages, userText, aiContext, intent, context, topicShifted);
        } catch (RuntimeException exception) {
            return chooseByText(userText, fallbackReplies, context.lastBotText());
        }
    }

    private String buildAiConversationContext(
            String seniorName,
            String userText,
            String intent,
            ConversationContext context,
            boolean topicShifted,
            Optional<SeniorAssistantRepository.MedicationHintProjection> nextMedication,
            Optional<SeniorAssistantRepository.AppointmentHintProjection> nextAppointment) {
        String normalizedUserText = normalizeForMatching(userText);
        boolean medicationRelevant = !topicShifted && isMedicationContextRelevant(intent, context, normalizedUserText);
        boolean appointmentRelevant = !topicShifted && isAppointmentContextRelevant(intent, context, normalizedUserText);
        StringBuilder builder = new StringBuilder();
        builder.append("Prenom prefere: ").append(safe(extractFirstName(seniorName))).append(". ");
        builder.append("Intent detecte: ").append(safe(intent)).append(". ");

        if (isSosHelpIntent(intent)) {
            builder.append("L'utilisateur demande comment declencher ou utiliser une alerte SOS. ");
            builder.append("Repondez d'abord avec une consigne concrete et simple sur le bouton SOS ou l'action immediate a faire. ");
            builder.append("Ne revenez pas a une ancienne discussion de douleur sauf si le nouveau message mentionne clairement cette douleur. ");
        }

        if (topicShifted) {
            builder.append("L'utilisateur semble changer de sujet ou rouvrir une conversation. ");
            builder.append("N'heritiez pas automatiquement de l'ancien sujet medical si le nouveau message ne le mentionne pas. ");
        } else {
            if (context.recentPainTopic()) {
                builder.append("Le sujet recent peut concerner une douleur. ");
            }
            if (context.recentMedicationTopic()) {
                builder.append("Le sujet recent peut concerner les medicaments. ");
            }
            if (context.recentAppointmentTopic()) {
                builder.append("Le sujet recent peut concerner un rendez-vous. ");
            }
            if (context.recentHighPainSignal()) {
                builder.append("Alerte: un signal de douleur forte a ete repere recemment. ");
            }
            if (context.lastBotAskedPainLocation()) {
                builder.append("La derniere question de l'assistant demandait l'endroit de la douleur. ");
            }
            if (context.lastBotAskedPainIntensity()) {
                builder.append("La derniere question de l'assistant demandait l'intensite de la douleur. ");
            }
            if (context.lastBotAskedPainDuration()) {
                builder.append("La derniere question de l'assistant demandait depuis quand la douleur dure. ");
            }
            if (context.latestPainLocation() != null && !context.latestPainLocation().isBlank()) {
                builder.append("Dernier endroit de douleur mentionne: ").append(context.latestPainLocation()).append(". ");
            }
            if (context.lastBotText() != null && !context.lastBotText().isBlank()) {
                builder.append("Derniere reponse assistant: ").append(context.lastBotText()).append(". ");
            }
        }
        if (medicationRelevant && nextMedication.isPresent()) {
            SeniorAssistantRepository.MedicationHintProjection med = nextMedication.get();
            builder.append("Prochaine prise connue: ")
                    .append(safe(med.getName()))
                    .append(formatDosage(med.getDosage()))
                    .append(" a ")
                    .append(formatTime(med.getScheduledTime()))
                    .append(". ");
        } else if (medicationRelevant) {
            builder.append("Aucune prochaine prise connue. ");
        }
        if (appointmentRelevant && nextAppointment.isPresent()) {
            SeniorAssistantRepository.AppointmentHintProjection appointment = nextAppointment.get();
            builder.append("Prochain rendez-vous connu: ")
                    .append(safe(appointment.getSpecialty()))
                    .append(" le ")
                    .append(appointment.getAppointmentAt().format(APPOINTMENT_FORMATTER))
                    .append(formatDoctor(appointment.getDoctorName()))
                    .append(". ");
        } else if (appointmentRelevant) {
            builder.append("Aucun prochain rendez-vous connu. ");
        }

        builder.append("Repondez de facon naturelle comme dans une vraie conversation, sans reutiliser de script fixe.");
        return builder.toString().trim();
    }

    private boolean isMedicationContextRelevant(String intent, ConversationContext context, String normalizedUserText) {
        return containsAny(intent, "medication", "medication_followup", "medication_taken", "medication_missed")
                || context.recentMedicationTopic()
                || mentionsMedicationOrAppointment(normalizedUserText) && containsAny(normalizedUserText,
                "medicament", "aspirine", "prise", "pilule", "cachet", "traitement");
    }

    private boolean isAppointmentContextRelevant(String intent, ConversationContext context, String normalizedUserText) {
        return containsAny(intent, "appointment", "appointment_followup")
                || context.recentAppointmentTopic()
                || mentionsMedicationOrAppointment(normalizedUserText) && containsAny(normalizedUserText,
                "rendez", "rdv", "docteur", "medecin", "consultation", "horaire");
    }

    private List<String> buildAiFallbackReplies(
            String seniorName,
            String userText,
            String intent,
            ConversationContext context,
            boolean topicShifted,
            Optional<SeniorAssistantRepository.MedicationHintProjection> nextMedication,
            Optional<SeniorAssistantRepository.AppointmentHintProjection> nextAppointment) {
        String firstName = extractFirstName(seniorName);
        String normalizedUserText = normalizeForMatching(userText);
        if ("urgent".equals(intent) || context.recentHighPainSignal()) {
            return List.of(
                    "Je suis avec vous " + firstName + ". Utilisez le bouton SOS maintenant et contactez un proche.",
                    "Votre situation peut demander une aide rapide. Declenchez SOS et appelez un proche sans attendre."
            );
        }

        if (isSosHelpIntent(intent)) {
            return List.of(
                    "Je suis avec vous " + firstName + ". Pour envoyer une alerte, appuyez sur le bouton SOS orange en bas de l'ecran puis confirmez.",
                    "Pas de souci. Touchez le bouton SOS pour prevenir votre famille tout de suite, puis confirmez l'alerte.",
                    "Je reste avec vous. Si vous avez besoin d'aide maintenant, appuyez sur SOS en bas de l'ecran et validez l'envoi."
            );
        }

        if (containsAny(intent, "pain", "pain_followup")
                || context.recentPainTopic()
                || context.lastBotAskedPainLocation()
                || context.lastBotAskedPainIntensity()
                || context.lastBotAskedPainDuration()) {
            if (containsAny(normalizedUserText, "je ne sais pas", "j ne sais pas", "sais pas", "aucune idee", "je sais pas")) {
                if (context.lastBotAskedPainIntensity()) {
                    return List.of(
                            "Pas de souci. Est-ce que la douleur vous semble plutot faible, moyenne ou forte ?",
                            "Ce n'est pas grave. Dites-moi simplement si la douleur est faible, moyenne ou forte.",
                            "Je suis avec vous. Sans chiffre, vous pouvez me dire si la douleur est legere, moyenne ou forte."
                    );
                }
                if (context.lastBotAskedPainDuration()) {
                    return List.of(
                            "Ce n'est pas grave. Est-ce que la douleur a commence aujourd'hui, hier, ou depuis plus longtemps ?",
                            "Pas de souci. Dites-moi juste si c'est depuis aujourd'hui, depuis hier, ou depuis plusieurs jours.",
                            "Je peux simplifier. La douleur a commence aujourd'hui, hier, ou depuis plus longtemps ?"
                    );
                }
                if (context.lastBotAskedPainLocation()) {
                    return List.of(
                            "Pas de souci. Pouvez-vous me montrer l'endroit: tete, dos, ventre, jambe ou autre ?",
                            "Ce n'est pas grave. Dites-moi simplement ou vous avez mal: tete, dos, ventre ou jambe ?",
                            "Je suis avec vous. Vous pouvez me dire l'endroit de la douleur avec un mot simple, comme tete ou jambe."
                    );
                }
            }

            if (context.lastBotAskedPainIntensity()) {
                return List.of(
                        "Pour m'aider a comprendre, pouvez-vous me donner une note de douleur de 0 a 10 ?",
                        "Dites-moi simplement la douleur sur une echelle de 0 a 10, meme approximativement.",
                        "Si vous voulez, donnez-moi juste un chiffre entre 0 et 10 pour la douleur."
                );
            }
            if (context.lastBotAskedPainDuration()) {
                return List.of(
                        "Pouvez-vous me dire depuis quand cette douleur est presente ?",
                        "Dites-moi simplement si la douleur a commence aujourd'hui, hier ou avant.",
                        "J'ai juste besoin de savoir depuis quand la douleur dure."
                );
            }
            if (context.lastBotAskedPainLocation()) {
                return List.of(
                        "Pouvez-vous me dire ou la douleur est la plus forte ?",
                        "Dites-moi juste l'endroit de la douleur: tete, dos, ventre, jambe ou autre.",
                        "Je suis avec vous. Ou est la douleur exactement ?"
                );
            }

            return List.of(
                    "Je suis avec vous " + firstName + ". Pouvez-vous me dire ou la douleur est la plus forte ?",
                    "On continue doucement. Dites-moi l'endroit de la douleur, puis son intensite.",
                    "Je vous ecoute. Parlez-moi de la douleur avec des mots simples, et on avance ensemble."
            );
        }

        if (topicShifted) {
            return List.of(
                    "Bonjour " + firstName + ". Je suis avec vous. Comment puis-je vous aider maintenant ?",
                    "Je suis la avec vous " + firstName + ". Nous pouvons repartir sur un nouveau sujet si vous voulez.",
                    "Bonjour. Dites-moi simplement ce dont vous avez envie de parler maintenant."
            );
        }

        String contextualHint = "";
        if (nextMedication.isPresent()) {
            SeniorAssistantRepository.MedicationHintProjection med = nextMedication.get();
            contextualHint = " Si besoin, votre prochaine prise connue est " + safe(med.getName())
                    + " a " + formatTime(med.getScheduledTime()) + ".";
        } else if (nextAppointment.isPresent()) {
            SeniorAssistantRepository.AppointmentHintProjection appointment = nextAppointment.get();
            contextualHint = " Si besoin, votre prochain rendez-vous connu est le "
                    + appointment.getAppointmentAt().format(APPOINTMENT_FORMATTER) + ".";
        }

        return List.of(
                "Je suis avec vous " + firstName + "." + contextualHint + " Dites-moi ce qui vous aiderait le plus maintenant.",
                "Je vous ecoute calmement." + contextualHint + " Nous pouvons avancer une etape a la fois.",
                "Merci pour votre message." + contextualHint + " Je reste disponible pour continuer avec vous."
        );
    }

    private String callClaudeApi(
            List<SeniorAssistantRepository.MessageProjection> recentMessages,
            String userMessage,
            String context,
            String intent,
            ConversationContext conversationContext,
            boolean topicShifted) {
        String apiKey = Optional.ofNullable(System.getenv("GROQ_API_KEY"))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .orElseThrow(() -> new IllegalStateException("Missing GROQ_API_KEY environment variable."));
        String userName = extractUserNameFromContext(context);
        String medications = extractMedicationSummaryFromContext(context);
        String systemPrompt = "Tu es l'assistant sante de CuraFamilia, "
                + "une application medicale pour seniors. "
                + "Tu parles a " + userName + ". "
                + "Ses medicaments : " + medications + "\n\n"
                + "Regles :\n"
                + "- Ton chaleureux, jamais condescendant\n"
                + "- Maximum 2 phrases par reponse\n"
                + "- Une seule question a la fois\n"
                + "- Si l'utilisateur dit merci, ok, ca va, je vais bien, ou une formule de cloture -> ne continue pas le sujet precedent; reponds chaleureusement et clos la conversation\n"
                + "- Si urgence, chute, douleur forte ou alerte mentionnee -> propose le SOS immediatement\n"
                + "- Si question sur un medicament -> utilise uniquement ses medicaments listes ci-dessus\n"
                + "- Jamais de diagnostic medical\n"
                + "- Si tu ne sais pas -> propose d'appeler le medecin";

        List<Map<String, Object>> aiMessages = new ArrayList<>();
        aiMessages.add(Map.of("role", "system", "content", systemPrompt));
        aiMessages.add(Map.of(
                "role", "system",
                "content", "Contexte conversationnel utile: " + safe(context)
                        + " Utilisez ce contexte seulement s'il est directement pertinent."
        ));
        aiMessages.addAll(buildRecentConversationMessages(recentMessages, userMessage, topicShifted));

        try (Jsonb jsonb = JsonbBuilder.create()) {
            String reply = requestGroqCompletion(jsonb, apiKey, aiMessages)
                    .map(this::cleanupAssistantReply)
                    .orElseThrow(() -> new IllegalStateException("Groq API returned no text."));
            if (isUsableAssistantReply(reply, userMessage, context, intent, conversationContext)) {
                return reply;
            }

            String repairedReply = requestGroqCompletion(
                    jsonb,
                    apiKey,
                    buildRepairMessages(userMessage, context, intent, conversationContext, reply)
            )
                    .map(this::cleanupAssistantReply)
                    .orElseThrow(() -> new IllegalStateException("Groq API returned no repaired text."));

            if (!isUsableAssistantReply(repairedReply, userMessage, context, intent, conversationContext)) {
                throw new IllegalStateException("Groq API returned unusable text.");
            }
            return repairedReply;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            System.err.println("[Groq] exception=" + exception);
            throw new IllegalStateException("Groq API call interrupted.", exception);
        } catch (IOException exception) {
            System.err.println("[Groq] exception=" + exception);
            throw new IllegalStateException("Groq API call failed.", exception);
        } catch (RuntimeException exception) {
            System.err.println("[Groq] exception=" + exception);
            throw new IllegalStateException("Groq API call failed.", exception);
        } catch (Exception exception) {
            System.err.println("[Groq] exception=" + exception);
            throw new IllegalStateException("Groq API call failed.", exception);
        }
    }

    private Optional<String> requestGroqCompletion(
            Jsonb jsonb,
            String apiKey,
            List<Map<String, Object>> messages) throws IOException, InterruptedException {
        Map<String, Object> groqRequest = Map.of(
                "model", "llama-3.3-70b-versatile",
                "messages", messages,
                "max_tokens", 300
        );

        String payload = jsonb.toJson(groqRequest);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + apiKey)
                .header("Accept", "application/json")
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        System.err.println("[Groq] status=" + response.statusCode());
        System.err.println("[Groq] body=" + response.body());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            System.err.println("[Groq] request failed with non-2xx status.");
            throw new IllegalStateException("Groq API returned status " + response.statusCode() + ".");
        }

        Map<?, ?> groqResponse = jsonb.fromJson(response.body(), Map.class);
        return extractGroqContent(groqResponse);
    }

    private List<Map<String, Object>> buildRepairMessages(
            String userMessage,
            String context,
            String intent,
            ConversationContext conversationContext,
            String invalidReply) {
        String rewriteInstruction = isSosHelpIntent(intent)
                ? "Si l'utilisateur demande comment declencher une alerte SOS, la nouvelle reponse doit expliquer simplement l'action a faire sans revenir a la douleur."
                : "Si la conversation en cours concerne une douleur ou une question de suivi, la nouvelle reponse doit rester sur cette douleur.";
        return List.of(
                Map.of(
                        "role", "system",
                        "content", "Reecrivez une reponse d'assistant sante en francais naturel. "
                                + "Vouvoyez strictement. N'utilisez jamais tu, toi, ton, ta, tes ou une forme comme t'inquiete. "
                                + "Gardez 1 ou 2 phrases courtes maximum. "
                                + "Ne changez pas de sujet. "
                                + rewriteInstruction
                ),
                Map.of(
                        "role", "user",
                        "content", "Dernier message utilisateur: " + safe(userMessage)
                                + "\nIntent detecte: " + safe(intent)
                                + "\nContexte utile: " + safe(context)
                                + "\nLa conversation recente concerne une douleur: " + (conversationContext.recentPainTopic() ? "oui" : "non")
                                + "\nLa derniere question assistant concernait l'intensite: " + (conversationContext.lastBotAskedPainIntensity() ? "oui" : "non")
                                + "\nLa derniere question assistant concernait la duree: " + (conversationContext.lastBotAskedPainDuration() ? "oui" : "non")
                                + "\nReponse a corriger: " + safe(invalidReply)
                                + "\nReecrivez uniquement la meilleure reponse finale."
                )
        );
    }

    private List<Map<String, Object>> buildRecentConversationMessages(
            List<SeniorAssistantRepository.MessageProjection> recentMessages,
            String userMessage,
            boolean topicShifted) {
        List<Map<String, Object>> aiMessages = new ArrayList<>();
        if (topicShifted) {
            aiMessages.add(Map.of("role", "user", "content", safe(userMessage)));
            return aiMessages;
        }
        if (recentMessages == null || recentMessages.isEmpty()) {
            aiMessages.add(Map.of("role", "user", "content", safe(userMessage)));
            return aiMessages;
        }

        int startIndex = Math.max(0, recentMessages.size() - 6);
        for (int index = startIndex; index < recentMessages.size(); index += 1) {
            SeniorAssistantRepository.MessageProjection message = recentMessages.get(index);
            if (message == null || message.getMessage() == null || message.getMessage().isBlank()) {
                continue;
            }
            String role = switch (normalizeStatus(message.getSender())) {
                case "senior" -> "user";
                case "bot" -> "assistant";
                default -> null;
            };
            if (role == null) {
                continue;
            }
            aiMessages.add(Map.of("role", role, "content", message.getMessage().trim()));
        }
        if (aiMessages.isEmpty()) {
            aiMessages.add(Map.of("role", "user", "content", safe(userMessage)));
        }
        return aiMessages;
    }

    private String cleanupAssistantReply(String reply) {
        if (reply == null) {
            return "";
        }
        return MULTI_SPACE_PATTERN.matcher(reply.replace('\n', ' ').trim()).replaceAll(" ");
    }

    private boolean isUsableAssistantReply(
            String reply,
            String userMessage,
            String context,
            String intent,
            ConversationContext conversationContext) {
        String normalizedReply = normalizeForMatching(reply);
        if (normalizedReply.isBlank()) {
            return false;
        }

        if (containsTutoiement(normalizedReply)) {
            return false;
        }

        String normalizedUserMessage = normalizeForMatching(userMessage);
        String normalizedContext = normalizeForMatching(context);
        boolean userMentionedCareContext = mentionsMedicationOrAppointment(normalizedUserMessage);
        boolean contextMentionedCareContext = mentionsMedicationOrAppointment(normalizedContext);
        boolean replyMentionsCareContext = mentionsMedicationOrAppointment(normalizedReply);
        if (!userMentionedCareContext && !contextMentionedCareContext && replyMentionsCareContext) {
            return false;
        }

        if (requiresPainFocus(intent, conversationContext) && !keepsPainFocus(normalizedReply)) {
            return false;
        }

        return !containsAny(normalizedReply, "ce matin la", "tu es", "as tu");
    }

    private boolean isTopicShiftMessage(String normalizedUserText, String intent, ConversationContext context) {
        if (normalizedUserText == null || normalizedUserText.isBlank()) {
            return false;
        }
        boolean hadTrackedMedicalContext = context.recentPainTopic()
                || context.recentMedicationTopic()
                || context.recentAppointmentTopic()
                || context.lastBotAskedPainLocation()
                || context.lastBotAskedPainIntensity()
                || context.lastBotAskedPainDuration();
        if (!hadTrackedMedicalContext) {
            return false;
        }
        if (isSosHelpIntent(intent)) {
            return true;
        }
        if (mentionsCareContext(normalizedUserText)) {
            return false;
        }
        if (containsAny(
                normalizedUserText,
                "autre chose",
                "changeons de sujet",
                "on change de sujet",
                "parlons d autre chose",
                "laisse tomber",
                "oublie ca",
                "oubliez ca",
                "passons a autre chose",
                "sinon"
        )) {
            return true;
        }
        return containsAny(normalizedUserText, "bonjour", "salut", "bonsoir", "hello", "hey", "hi", "hola", "coucou")
                || (containsAny(intent, "greeting", "wellbeing", "gratitude") && isVeryShortMessage(normalizedUserText));
    }

    private boolean mentionsCareContext(String normalizedText) {
        return mentionsPainContext(normalizedText) || mentionsMedicationOrAppointment(normalizedText);
    }

    private boolean mentionsPainContext(String normalizedText) {
        return containsAny(
                normalizedText,
                "douleur",
                "j ai mal",
                "mal au",
                "migraine",
                "tete",
                "dos",
                "ventre",
                "abdomen",
                "poitrine",
                "thorac",
                "jambe",
                "bras",
                "genou",
                "epaule",
                "echelle",
                "0 a 10",
                "intensite"
        );
    }

    private boolean containsTutoiement(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return false;
        }
        return TUTOIEMENT_PATTERN.matcher(normalizedText).find();
    }

    private boolean mentionsMedicationOrAppointment(String normalizedText) {
        return containsAny(normalizedText, "medicament", "aspirine", "prise", "pilule", "cachet", "traitement",
                "rendez", "rdv", "docteur", "medecin", "consultation", "horaire");
    }

    private boolean requiresPainFocus(String intent, ConversationContext conversationContext) {
        if (isSosHelpIntent(intent)) {
            return false;
        }
        return containsAny(intent, "pain", "pain_followup")
                || conversationContext.recentPainTopic()
                || conversationContext.lastBotAskedPainLocation()
                || conversationContext.lastBotAskedPainIntensity()
                || conversationContext.lastBotAskedPainDuration();
    }

    private boolean keepsPainFocus(String normalizedReply) {
        return containsAny(
                normalizedReply,
                "douleur",
                "mal",
                "jambe",
                "tete",
                "dos",
                "ventre",
                "poitrine",
                "echelle",
                "0 a 10",
                "note",
                "intensite",
                "depuis",
                "heure",
                "heures",
                "matin",
                "faible",
                "moyenne",
                "forte",
                "supportable",
                "sos",
                "reposez",
                "hydratez"
        );
    }

    private Optional<String> extractGroqContent(Map<?, ?> groqResponse) {
        if (groqResponse == null) {
            return Optional.empty();
        }

        Object choicesValue = groqResponse.get("choices");
        if (!(choicesValue instanceof List<?> choices)) {
            return Optional.empty();
        }

        for (Object choiceValue : choices) {
            if (!(choiceValue instanceof Map<?, ?> choice)) {
                continue;
            }
            Object messageValue = choice.get("message");
            if (!(messageValue instanceof Map<?, ?> message)) {
                continue;
            }
            Object contentValue = message.get("content");
            if (contentValue instanceof String content && !content.isBlank()) {
                return Optional.of(content);
            }
        }
        return Optional.empty();
    }

    private ConversationContext analyzeConversationContext(List<SeniorAssistantRepository.MessageProjection> messages) {
        if (messages == null || messages.isEmpty()) {
            return new ConversationContext(false, false, false, false, false, false, false, "", null, 0);
        }

        Optional<SeniorAssistantRepository.MessageProjection> lastBotMessage = findLatestMessageBySender(messages, "bot");
        String lastBotText = normalizeForMatching(lastBotMessage
                .map(SeniorAssistantRepository.MessageProjection::getMessage)
                .orElse(""));

        boolean lastBotAskedPainLocation = containsAny(
                lastBotText,
                "ou la douleur est la plus forte",
                "ou avez vous mal",
                "ou avez-vous mal",
                "a quel endroit",
                "ou est la douleur"
        );
        boolean lastBotAskedPainIntensity = containsAny(
                lastBotText,
                "sur une echelle de 0 a 10",
                "de 0 a 10",
                "intensite",
                "vous la sentez a combien"
        );
        boolean lastBotAskedPainDuration = containsAny(
                lastBotText,
                "depuis combien de temps",
                "depuis quand",
                "duree"
        );

        String recentUserText = messages.stream()
                .filter(message -> "senior".equalsIgnoreCase(message.getSender()))
                .map(SeniorAssistantRepository.MessageProjection::getMessage)
                .map(this::normalizeForMatching)
                .reduce("", (left, right) -> left + " " + right)
                .trim();

        String recentCombinedText = messages.stream()
                .map(SeniorAssistantRepository.MessageProjection::getMessage)
                .map(this::normalizeForMatching)
                .reduce("", (left, right) -> left + " " + right)
                .trim();

        boolean recentPainTopic = containsAny(
                recentCombinedText,
                "douleur",
                "j'ai mal",
                "j ai mal",
                "mal au",
                "migraine",
                "tete",
                "dos"
        );
        boolean recentMedicationTopic = containsAny(
                recentCombinedText,
                "medicament",
                "prise",
                "traitement",
                "pilule"
        );
        boolean recentAppointmentTopic = containsAny(
                recentCombinedText,
                "rendez",
                "rdv",
                "docteur",
                "medecin"
        );
        boolean recentHighPainSignal = messages.stream()
                .filter(message -> "senior".equalsIgnoreCase(message.getSender()))
                .map(SeniorAssistantRepository.MessageProjection::getMessage)
                .map(this::normalizeForMatching)
                .anyMatch(messageText -> extractPainScore(messageText).map(value -> value >= 8).orElse(false)
                        || extractPainLevel(messageText) == PainLevel.SEVERE);

        String latestPainLocation = null;
        for (int index = messages.size() - 1; index >= 0; index -= 1) {
            SeniorAssistantRepository.MessageProjection message = messages.get(index);
            if (!"senior".equalsIgnoreCase(message.getSender())) {
                continue;
            }
            String normalized = normalizeForMatching(message.getMessage());
            Optional<String> location = extractPainLocation(normalized);
            if (location.isPresent()) {
                latestPainLocation = location.get();
                break;
            }
        }

        if (!recentPainTopic) {
            // Keep pain-followup prompts scoped to actual pain discussions only.
            lastBotAskedPainLocation = false;
            lastBotAskedPainIntensity = false;
            lastBotAskedPainDuration = false;
        }

        if (!containsAny(recentUserText, "douleur", "j ai mal", "mal au", "migraine", "tete", "dos", "poitrine", "thorac")) {
            latestPainLocation = null;
        }

        int recentGeneralTurns = 0;
        int inspectedUserTurns = 0;
        for (int index = messages.size() - 1; index >= 0 && inspectedUserTurns < 4; index -= 1) {
            SeniorAssistantRepository.MessageProjection message = messages.get(index);
            if (!"senior".equalsIgnoreCase(message.getSender())) {
                continue;
            }
            inspectedUserTurns += 1;
            String intent = normalizeStatus(message.getIntent());
            if (intent == null || intent.isBlank() || "general".equals(intent)) {
                recentGeneralTurns += 1;
            }
        }

        return new ConversationContext(
                lastBotAskedPainLocation,
                lastBotAskedPainIntensity,
                lastBotAskedPainDuration,
                recentPainTopic,
                recentMedicationTopic,
                recentAppointmentTopic,
                recentHighPainSignal,
                lastBotText,
                latestPainLocation,
                recentGeneralTurns
        );
    }

    private String buildPainFollowupReply(String firstName, String normalizedUserText, ConversationContext context) {
        if (containsAny(normalizedUserText, "poitrine", "thorac")) {
            return "Je suis avec vous " + firstName + ". Une douleur a la poitrine demande une action immediate. "
                    + "Declenchez SOS maintenant et contactez un proche.";
        }

        Optional<String> location = extractPainLocation(normalizedUserText);
        Optional<Integer> score = extractPainScore(normalizedUserText);
        Optional<String> duration = extractDurationDetail(normalizedUserText);
        PainLevel levelFromWords = extractPainLevel(normalizedUserText);

        if (context.recentHighPainSignal()
                && (duration.isPresent() || containsAny(normalizedUserText, "toujours", "encore", "pire", "augmente", "pas mieux"))) {
            return "Merci de me tenir informee. Comme la douleur reste forte, le plus sur est de declencher SOS "
                    + "et prevenir un proche maintenant.";
        }

        if (context.lastBotAskedPainLocation()) {
            if (location.isPresent()) {
                return "Merci. La douleur est " + location.get()
                        + ". Sur une echelle de 0 a 10, vous la notez a combien ?";
            }
            return "Je reste avec vous. Dites-moi l'endroit precis de la douleur (tete, dos, ventre, etc.).";
        }

        if (context.lastBotAskedPainIntensity()) {
            if (score.isPresent()) {
                int value = score.get();
                if (value >= 8) {
                    return "Merci de me l'avoir dit. Une douleur a " + value + "/10 est importante. "
                            + "Declenchez SOS maintenant et prevenez un proche.";
                }
                return "Merci, c'est note (" + value + "/10). Depuis combien de temps cette douleur est presente ?";
            }
            if (levelFromWords == PainLevel.SEVERE) {
                return "Merci. Si la douleur est tres forte, il vaut mieux declencher SOS et prevenir un proche.";
            }
            if (levelFromWords == PainLevel.MODERATE || levelFromWords == PainLevel.MILD) {
                return "D'accord, merci. Depuis combien de temps cette douleur est presente ?";
            }
            return "Pour bien vous aider, pouvez-vous me donner une note de douleur de 0 a 10 ?";
        }

        if (context.lastBotAskedPainDuration()) {
            if (duration.isPresent()) {
                return "Merci pour la precision. Continuez au repos et hydratez-vous. "
                        + "Si la douleur augmente, dure plusieurs heures, ou vous inquiete, on declenche SOS ensemble.";
            }
            return "D'accord. Pouvez-vous me dire depuis quand la douleur a commence ?";
        }

        if (location.isPresent() && score.isEmpty()) {
            return "Merci. La douleur est " + location.get()
                    + ". Sur une echelle de 0 a 10, vous la notez a combien ?";
        }

        if (score.isPresent() && duration.isEmpty()) {
            int value = score.get();
            if (value >= 8) {
                return "Merci de me l'avoir dit. Une douleur a " + value + "/10 est importante. "
                        + "Declenchez SOS et appelez un proche.";
            }
            return "Merci (" + value + "/10). Depuis combien de temps cette douleur est presente ?";
        }

        if (duration.isPresent()) {
            return "Merci. On surveille ensemble. Reposez-vous 15 a 20 minutes et hydratez-vous. "
                    + "Si la douleur augmente ou devient difficile a supporter, on passe en SOS.";
        }

        if (context.latestPainLocation() != null) {
            return "On continue ensemble. Pour la douleur " + context.latestPainLocation()
                    + ", pouvez-vous me donner une note de 0 a 10 ?";
        }

        return "On continue doucement. Dites-moi d'abord ou est la douleur, puis son intensite de 0 a 10.";
    }

    private SeniorAssistantRepository.DailySummaryProjection buildSummaryFromMessages(
            List<SeniorAssistantRepository.MessageProjection> messages) {
        String userText = messages.stream()
                .filter(message -> "senior".equalsIgnoreCase(message.getSender()))
                .map(SeniorAssistantRepository.MessageProjection::getMessage)
                .map(this::normalizeForMatching)
                .reduce("", (left, right) -> left + " " + right)
                .trim();

        if (userText.isBlank()) {
            return new SeniorAssistantRepository.DailySummaryProjection(
                    "stable",
                    "aucune signalee",
                    false,
                    false,
                    false,
                    "Aucun echange utilisateur enregistre pour le moment."
            );
        }

        boolean medicationTopic = containsAny(userText, "medicament", "prise", "pilule", "cachet", "traitement");
        boolean medicationMissed = medicationTopic && containsAny(userText, "oublie", "pas pris", "rate", "pas encore pris");
        boolean appointmentTopic = containsAny(userText, "rendez", "rdv", "docteur", "medecin", "consultation");
        boolean painMentioned = containsAny(userText, "douleur", "j'ai mal", "mal au", "migraine", "tete", "dos", "poitrine", "thorac");
        boolean fatigueMentioned = containsAny(userText, "fatigue", "epuise", "faible");
        boolean wellbeingMentioned = mentionsPositiveWellbeing(userText);
        boolean lowWellbeingMentioned = mentionsLowWellbeing(userText);
        boolean emotionalNeed = containsAny(userText, "seul", "seule", "triste", "angoisse", "inquiet", "stress", "besoin de compagnie");
        boolean urgentSignal = containsAny(userText, "douleur thorac", "respire mal", "essouff", "malaise", "chute", "urgence");
        boolean needsAttention = urgentSignal
                || medicationMissed
                || lowWellbeingMentioned
                || containsAny(userText, "pas bien", "tres mal", "beaucoup de douleur", "faiblesse importante");

        String mood = resolveMood(
                urgentSignal,
                wellbeingMentioned,
                lowWellbeingMentioned,
                fatigueMentioned,
                emotionalNeed,
                painMentioned
        );
        String pain = resolvePainLabel(userText, painMentioned);
        String summaryText = buildDailySummaryText(
                mood,
                pain,
                medicationTopic,
                medicationMissed,
                appointmentTopic,
                needsAttention
        );

        return new SeniorAssistantRepository.DailySummaryProjection(
                mood,
                pain,
                medicationTopic,
                appointmentTopic,
                needsAttention,
                summaryText.trim()
        );
    }

    private String resolveMood(boolean urgentSignal, boolean wellbeingMentioned,
                               boolean lowWellbeingMentioned, boolean fatigueMentioned,
                               boolean emotionalNeed, boolean painMentioned) {
        if (urgentSignal) {
            return "a_surveiller";
        }
        if (lowWellbeingMentioned) {
            return "a_surveiller";
        }
        if (wellbeingMentioned && !fatigueMentioned && !painMentioned) {
            return "plutot_bien";
        }
        if (fatigueMentioned) {
            return "fatigue";
        }
        if (emotionalNeed) {
            return "besoin_de_presence";
        }
        if (painMentioned) {
            return "inconfort";
        }
        return "stable";
    }

    private boolean mentionsPositiveWellbeing(String userText) {
        return containsAny(
                userText,
                "je vais bien",
                "tout va bien",
                "ca va",
                "je me sens bien",
                "je suis content",
                "je suis contente",
                "content aujourd hui",
                "contente aujourd hui",
                "je suis heureux",
                "je suis heureuse",
                "heureux aujourd hui",
                "heureuse aujourd hui",
                "je vais mieux",
                "ca va mieux",
                "je me sens mieux",
                "de bonne humeur"
        );
    }

    private boolean mentionsLowWellbeing(String userText) {
        return containsAny(
                userText,
                "je vais mal",
                "ca ne va pas",
                "je me sens mal",
                "pas bien",
                "tres mal",
                "moral bas",
                "pas le moral",
                "je suis triste",
                "je me sens seul",
                "je me sens seule"
        );
    }

    private String buildDailySummaryText(String mood, String pain, boolean medicationTopic,
                                         boolean medicationMissed, boolean appointmentTopic,
                                         boolean needsAttention) {
        String summaryText = "Resume du jour: " + describeMoodForSummary(mood)
                + ". Douleur: " + pain + ". ";
        if (medicationTopic) {
            summaryText += "Les medicaments ont ete abordes. ";
        }
        if (medicationMissed) {
            summaryText += "Une prise manquee a ete signalee. ";
        }
        if (appointmentTopic) {
            summaryText += "Le rendez-vous a ete aborde. ";
        }
        summaryText += needsAttention
                ? "Une attention familiale rapide est conseillee."
                : "Aucune alerte majeure detectee.";
        return summaryText.trim();
    }

    private String describeMoodForSummary(String mood) {
        if (mood == null || mood.isBlank()) {
            return "etat general stable";
        }
        return switch (mood) {
            case "plutot_bien" -> "il semble aller plutot bien";
            case "fatigue" -> "il semble fatigue";
            case "besoin_de_presence" -> "il semble avoir besoin de presence";
            case "inconfort" -> "il signale un inconfort";
            case "a_surveiller" -> "son etat semble a surveiller";
            default -> "etat general stable";
        };
    }

    private String resolvePainLabel(String userText, boolean painMentioned) {
        if (!painMentioned) {
            return "aucune signalee";
        }
        if (containsAny(userText, "poitrine", "thorac")) {
            return "douleur thoracique";
        }
        if (containsAny(userText, "dos", "lombaire")) {
            return "douleur au dos";
        }
        if (containsAny(userText, "tete", "migraine")) {
            return "douleur a la tete";
        }
        return "douleur signalee";
    }

    private List<String> buildQuickReplies(String intent, boolean needsAttention) {
        if (needsAttention) {
            return List.of("Declencher SOS", "Appeler un proche", "Je suis encore mal");
        }

        return switch (intent) {
            case "sos_help" -> List.of("Declencher SOS", "Prevenir ma famille", "Rester avec moi");
            case "medication", "medication_followup" -> List.of("Quel est le prochain ?", "Je l'ai pris", "Rappelle-moi");
            case "medication_taken" -> List.of("Merci", "Et la prochaine ?", "Je me repose");
            case "medication_missed" -> List.of("Que faire ?", "Prevenir ma famille", "Rappel prochaine prise");
            case "appointment", "appointment_followup" -> List.of("Rappelle la date", "Qui est le medecin ?", "Merci");
            case "pain" -> List.of("J'ai mal a la tete", "J'ai mal au dos", "Que faire ?");
            case "pain_followup" -> List.of("Douleur 3/10", "Douleur 7/10", "Depuis ce matin");
            case "fatigue" -> List.of("Je vais me reposer", "Rappelle mes prises", "On reparle plus tard");
            case "emotional_support", "anxiety_support" -> List.of("Parler un peu", "Prevenir ma famille", "Respirer ensemble");
            case "gratitude" -> List.of("Merci encore", "Je vais bien", "On continue");
            case "clarify_scope" -> List.of("J'ai mal", "Mes medicaments", "Mon rendez-vous");
            default -> DEFAULT_QUICK_REPLIES;
        };
    }

    private Optional<String> findLatestUserIntent(List<SeniorAssistantRepository.MessageProjection> messages) {
        return findLatestMessageBySender(messages, "senior")
                .map(SeniorAssistantRepository.MessageProjection::getIntent);
    }

    private String extractUserNameFromContext(String context) {
        if (context == null || context.isBlank()) {
            return "la personne suivie";
        }
        Matcher matcher = Pattern.compile("Prenom prefere: ([^.]+)").matcher(context);
        if (matcher.find()) {
            String value = safe(matcher.group(1));
            if (!value.isBlank()) {
                return value;
            }
        }
        return "la personne suivie";
    }

    private String extractMedicationSummaryFromContext(String context) {
        if (context == null || context.isBlank()) {
            return "aucun medicament connu";
        }
        Matcher matcher = Pattern.compile("Prochaine prise connue: ([^.]+)").matcher(context);
        if (matcher.find()) {
            String value = safe(matcher.group(1));
            if (!value.isBlank()) {
                return value;
            }
        }
        return "aucun medicament connu";
    }

    private boolean isSosHelpIntent(String intent) {
        return "sos_help".equals(intent);
    }

    private Optional<SeniorAssistantRepository.MessageProjection> findLatestMessageBySender(
            List<SeniorAssistantRepository.MessageProjection> messages,
            String sender) {
        return messages.stream()
                .filter(message -> sender.equalsIgnoreCase(message.getSender()))
                .reduce((first, second) -> second);
    }

    private List<AssistantConversationResponse.MessageItem> mapMessages(
            List<SeniorAssistantRepository.MessageProjection> messages) {
        return messages.stream()
                .map(this::mapMessage)
                .toList();
    }

    private AssistantConversationResponse.MessageItem mapMessage(SeniorAssistantRepository.MessageProjection projection) {
        if (projection == null) {
            return null;
        }
        return new AssistantConversationResponse.MessageItem(
                projection.getId(),
                normalizeStatus(projection.getSender()),
                projection.getMessage(),
                projection.getIntent(),
                formatDateTime(projection.getCreatedAt())
        );
    }

    private AssistantConversationResponse.DailySummary mapSummary(SeniorAssistantRepository.DailySummaryProjection summary) {
        return new AssistantConversationResponse.DailySummary(
                summary.mood(),
                summary.pain(),
                summary.medicationTopic(),
                summary.appointmentTopic(),
                summary.needsAttention(),
                summary.summaryText()
        );
    }

    private boolean containsPainLocation(String normalizedText) {
        return extractPainLocation(normalizedText).isPresent();
    }

    private Optional<String> extractPainLocation(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return Optional.empty();
        }
        if (containsAny(normalizedText, "tete", "migraine")) {
            return Optional.of("a la tete");
        }
        if (containsAny(normalizedText, "dos", "lombaire")) {
            return Optional.of("au dos");
        }
        if (containsAny(normalizedText, "ventre", "estomac", "abdomen")) {
            return Optional.of("au ventre");
        }
        if (containsAny(normalizedText, "genou", "jambe", "hanche", "pied")) {
            return Optional.of("a la jambe");
        }
        if (containsAny(normalizedText, "epaule", "bras", "main")) {
            return Optional.of("au bras");
        }
        if (containsAny(normalizedText, "poitrine", "thorac")) {
            return Optional.of("a la poitrine");
        }
        return Optional.empty();
    }

    private Optional<Integer> extractPainScore(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return Optional.empty();
        }
        Matcher matcher = PAIN_SCORE_PATTERN.matcher(normalizedText);
        if (!matcher.find()) {
            return Optional.empty();
        }
        try {
            int score = Integer.parseInt(matcher.group(1));
            if (score >= 0 && score <= 10) {
                return Optional.of(score);
            }
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
        return Optional.empty();
    }

    private PainLevel extractPainLevel(String normalizedText) {
        if (containsAny(normalizedText, "insupportable", "tres fort", "tres forte", "trop fort", "trop forte")) {
            return PainLevel.SEVERE;
        }
        if (containsAny(normalizedText, "fort", "forte")) {
            return PainLevel.SEVERE;
        }
        if (containsAny(normalizedText, "moyen", "modere", "moderee")) {
            return PainLevel.MODERATE;
        }
        if (containsAny(normalizedText, "leger", "legere", "supportable", "faible")) {
            return PainLevel.MILD;
        }
        return PainLevel.UNKNOWN;
    }

    private boolean containsDurationAnswer(String normalizedText) {
        return extractDurationDetail(normalizedText).isPresent();
    }

    private Optional<String> extractDurationDetail(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return Optional.empty();
        }
        if (containsAny(normalizedText, "depuis", "heure", "heures", "minute", "minutes", "jour", "jours", "ce matin", "hier")) {
            return Optional.of("precisee");
        }
        return Optional.empty();
    }

    private String normalizeForMatching(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value.toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        normalized = DIACRITICS_PATTERN.matcher(normalized).replaceAll("");
        normalized = NON_WORD_PATTERN.matcher(normalized).replaceAll(" ");
        normalized = MULTI_SPACE_PATTERN.matcher(normalized).replaceAll(" ").trim();
        return normalized;
    }

    private boolean containsAny(String text, String... candidates) {
        if (text == null || text.isBlank()) {
            return false;
        }
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank() && text.contains(candidate)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasAnyStem(String text, String... stems) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String[] tokens = text.split("\\s+");
        for (String token : tokens) {
            if (token == null || token.isBlank()) {
                continue;
            }
            for (String stem : stems) {
                if (stem != null && !stem.isBlank() && token.startsWith(stem)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean isAcknowledgement(String normalizedText) {
        return containsAny(
                normalizedText,
                "ok",
                "okay",
                "d accord",
                "dac",
                "oui",
                "non",
                "ca marche",
                "entendu",
                "compris",
                "c est bon"
        );
    }

    private boolean isVeryShortMessage(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return true;
        }
        int wordCount = 0;
        for (String token : normalizedText.split("\\s+")) {
            if (token != null && !token.isBlank()) {
                wordCount += 1;
            }
        }
        return wordCount <= 2;
    }

    private String chooseByText(String seed, List<String> options) {
        return chooseByText(seed, options, null);
    }

    private String chooseByText(String seed, List<String> options, String previousReply) {
        if (options == null || options.isEmpty()) {
            return "";
        }
        int startIndex = Math.floorMod((seed == null ? 0 : seed.hashCode()), options.size());
        for (int offset = 0; offset < options.size(); offset += 1) {
            String candidate = options.get((startIndex + offset) % options.size());
            if (!looksRepeatedReply(previousReply, candidate)) {
                return candidate;
            }
        }
        return options.get(startIndex);
    }

    private boolean looksRepeatedReply(String previousReply, String candidateReply) {
        if (previousReply == null || previousReply.isBlank() || candidateReply == null || candidateReply.isBlank()) {
            return false;
        }
        String normalizedPrevious = normalizeForMatching(previousReply);
        String normalizedCandidate = normalizeForMatching(candidateReply);
        if (normalizedPrevious.equals(normalizedCandidate)) {
            return true;
        }
        int sampleLength = Math.min(24, normalizedCandidate.length());
        if (sampleLength < 12) {
            return false;
        }
        String candidateSample = normalizedCandidate.substring(0, sampleLength);
        return normalizedPrevious.contains(candidateSample);
    }

    private String extractFirstName(String name) {
        if (name == null || name.isBlank()) {
            return "cher(e) ami(e)";
        }
        String[] parts = name.trim().split("\\s+");
        return parts.length == 0 ? "cher(e) ami(e)" : parts[0];
    }

    private String formatTime(LocalTime value) {
        if (value == null) {
            return "--:--";
        }
        return value.format(TIME_FORMATTER);
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.format(DATE_TIME_FORMATTER);
    }

    private String normalizeStatus(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String formatDosage(String dosage) {
        if (dosage == null || dosage.isBlank()) {
            return "";
        }
        return " (" + dosage.trim() + ")";
    }

    private String formatDoctor(String doctorName) {
        if (doctorName == null || doctorName.isBlank()) {
            return "";
        }
        return " avec " + doctorName.trim();
    }

    private record ConversationContext(
            boolean lastBotAskedPainLocation,
            boolean lastBotAskedPainIntensity,
            boolean lastBotAskedPainDuration,
            boolean recentPainTopic,
            boolean recentMedicationTopic,
            boolean recentAppointmentTopic,
            boolean recentHighPainSignal,
            String lastBotText,
            String latestPainLocation,
            int recentGeneralTurns
    ) {
    }

    private enum PainLevel {
        UNKNOWN,
        MILD,
        MODERATE,
        SEVERE
    }

    private void rollback(EntityTransaction transaction) {
        if (transaction != null && transaction.isActive()) {
            transaction.rollback();
        }
    }
}
