package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.DailyCheckinRequest;
import com.curafamilia.auth.dto.DailyCheckinResponse;
import com.curafamilia.auth.dto.HomeResponse;
import com.curafamilia.auth.dto.MedicationTakeRequest;
import com.curafamilia.auth.dto.MedicationTakeResponse;
import com.curafamilia.auth.dto.SosAlertRequest;
import com.curafamilia.auth.dto.SosAlertResponse;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.realtime.RealtimeEventBus;
import com.curafamilia.auth.repository.SeniorHomeRepository;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.security.SeniorAccessResolver;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.ws.rs.core.Response;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

public class SeniorHomeService {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter DATE_LABEL_FORMATTER = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", Locale.FRENCH);
    private static final long SOS_REPEAT_WINDOW_MINUTES = 10;
    private static final int MORNING_SESSION_END_HOUR = 14;
    private static final List<String> LEGACY_THREE_STEP_ANSWERS = List.of("Oui", "Un peu", "Non");
    private static final CheckinProfile MORNING_WELLBEING_PROFILE = new CheckinProfile(
            "Comment vous sentez-vous ce matin ?",
            List.of("Bien", "Moyen", "Difficile"),
            List.of("Bien", "Moyen", "Difficile"),
            List.of()
    );
    private static final CheckinProfile MORNING_SLEEP_PROFILE = new CheckinProfile(
            "Avez-vous bien dormi ?",
            List.of("Oui", "Pas vraiment", "Non"),
            List.of("Oui", "Pas vraiment", "Non"),
            List.of()
    );
    private static final CheckinProfile EVENING_DAY_PROFILE = new CheckinProfile(
            "Comment s'est pass\u00E9e votre journ\u00E9e ?",
            List.of("Bien", "Moyenne", "Difficile"),
            List.of("Bien", "Moyenne", "Difficile"),
            LEGACY_THREE_STEP_ANSWERS
    );
    private static final CheckinProfile EVENING_SIDE_EFFECTS_PROFILE = new CheckinProfile(
            "Avez-vous ressenti des effets ind\u00E9sirables ?",
            List.of("Non", "Oui (lesquels ?)"),
            List.of("Non", "Oui"),
            List.of()
    );
    private static final List<CheckinProfile> MORNING_PROFILES = List.of(
            MORNING_WELLBEING_PROFILE,
            MORNING_SLEEP_PROFILE
    );
    private static final List<CheckinProfile> EVENING_PROFILES = List.of(
            EVENING_DAY_PROFILE,
            EVENING_SIDE_EFFECTS_PROFILE
    );
    private static final List<CheckinProfile> ALL_CHECKIN_PROFILES = List.of(
            MORNING_WELLBEING_PROFILE,
            MORNING_SLEEP_PROFILE,
            EVENING_DAY_PROFILE,
            EVENING_SIDE_EFFECTS_PROFILE
    );
    private final SeniorAccessResolver seniorAccessResolver = new SeniorAccessResolver();

    public HomeResponse getHome(AuthenticatedUser actor, Long requestedSeniorId, String dateValue) {
        LocalDate targetDate = parseDateOrToday(dateValue);
        LocalDateTime now = LocalDateTime.now();

        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);
            SeniorHomeRepository repository = new SeniorHomeRepository(entityManager);
            SeniorHomeRepository.SeniorProjection senior = ensureSeniorExists(repository, seniorId);

            List<SeniorHomeRepository.MedicationProjection> medications = repository.findActiveMedications(seniorId);
            Map<Long, SeniorHomeRepository.MedicationTakeProjection> takesByMedicationId =
                    repository.findMedicationTakesForDate(seniorId, targetDate);

            List<HomeResponse.MedicationItem> medicationItems = medications.stream()
                    .map(medication -> mapMedicationItem(medication, takesByMedicationId.get(medication.getId()), targetDate, now))
                    .toList();

            HomeResponse.NextMedication nextMedication = buildNextMedication(medicationItems, targetDate, now);

            HomeResponse.AppointmentInfo nextAppointment = repository
                    .findNextScheduledAppointment(seniorId, now)
                    .map(appointment -> new HomeResponse.AppointmentInfo(
                            appointment.getId(),
                            appointment.getSpecialty(),
                            formatDateTime(appointment.getAppointmentAt()),
                            appointment.getDoctorName(),
                            appointment.getNotes(),
                            appointment.getStatus()))
                    .orElse(null);

            List<CheckinProfile> activeProfiles = resolveActiveCheckinProfiles(now.toLocalTime());
            List<HomeResponse.DailyQuestion> dailyQuestions = activeProfiles.stream()
                    .map(profile -> {
                        Optional<SeniorHomeRepository.DailyCheckinProjection> latestCheckin =
                                repository.findLatestCheckinForQuestionAndDate(seniorId, profile.question(), targetDate);
                        return new HomeResponse.DailyQuestion(
                                profile.question(),
                                profile.options(),
                                latestCheckin
                                        .map(checkin -> mapStoredAnswerToDisplay(checkin.getAnswer(), profile))
                                        .orElse(null),
                                latestCheckin.map(checkin -> formatDateTime(checkin.getAnsweredAt())).orElse(null)
                        );
                    })
                    .toList();
            HomeResponse.DailyQuestion dailyQuestion = dailyQuestions.isEmpty() ? null : dailyQuestions.getFirst();

            HomeResponse.SosAlertInfo latestSosAlert = repository.findLatestSosAlert(seniorId)
                    .map(alert -> new HomeResponse.SosAlertInfo(
                            alert.getId(),
                            alert.getStatus(),
                            formatDateTime(alert.getTriggeredAt()),
                            alert.getComment()))
                    .orElse(null);

            return new HomeResponse(
                    new HomeResponse.SeniorInfo(senior.getId(), senior.getName()),
                    new HomeResponse.DateInfo(targetDate.format(DATE_FORMATTER), capitalizeFirst(targetDate.format(DATE_LABEL_FORMATTER))),
                    nextMedication,
                    dailyQuestion,
                    dailyQuestions,
                    medicationItems,
                    nextAppointment,
                    latestSosAlert
            );
        } finally {
            entityManager.close();
        }
    }

    public MedicationTakeResponse markMedicationTaken(AuthenticatedUser actor, Long medicationId, MedicationTakeRequest request) {
        if (medicationId == null || medicationId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "medicationId is required.");
        }
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();

        try {
            Long seniorId = seniorAccessResolver.resolveSeniorOwnerId(entityManager, actor);
            SeniorHomeRepository repository = new SeniorHomeRepository(entityManager);
            ensureSeniorExists(repository, seniorId);
            SeniorHomeRepository.MedicationProjection medication = repository
                    .findMedicationForSenior(seniorId, medicationId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Medication not found for this senior."));

            LocalDateTime scheduledAt = hasText(request.getScheduledAt())
                    ? parseDateTime(request.getScheduledAt(), "scheduledAt")
                    : LocalDate.now().atTime(medication.getScheduledTime());
            LocalDateTime takenAt = hasText(request.getTakenAt())
                    ? parseDateTime(request.getTakenAt(), "takenAt")
                    : LocalDateTime.now();

            transaction.begin();
            repository.upsertMedicationTake(medicationId, seniorId, scheduledAt, takenAt);
            transaction.commit();

            SeniorHomeRepository.MedicationTakeProjection take = repository
                    .findMedicationTake(medicationId, scheduledAt)
                    .orElse(new SeniorHomeRepository.MedicationTakeProjection(medicationId, scheduledAt, takenAt, "taken"));

            MedicationTakeResponse response = new MedicationTakeResponse(
                    "Prise enregistree.",
                    new MedicationTakeResponse.TakeData(
                            medicationId,
                            seniorId,
                            formatDateTime(take.getScheduledAt()),
                            formatDateTime(take.getTakenAt()),
                            normalizeStatus(take.getStatus())
                    )
            );
            RealtimeEventBus.publish("medication:taken", seniorId, actor, response.getTake());
            return response;
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

    public DailyCheckinResponse submitDailyCheckin(AuthenticatedUser actor, DailyCheckinRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        CheckinProfile profile = resolveCheckinProfileByQuestion(request.getQuestion(), LocalTime.now());
        String answer = mapDisplayOrCanonicalAnswerToStoredValue(request.getAnswer(), profile);
        String question = profile.question();
        String displayAnswer = mapStoredAnswerToDisplay(answer, profile);
        LocalDateTime answeredAt = LocalDateTime.now();

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();

        try {
            Long seniorId = seniorAccessResolver.resolveSeniorOwnerId(entityManager, actor);
            SeniorHomeRepository repository = new SeniorHomeRepository(entityManager);
            ensureSeniorExists(repository, seniorId);

            transaction.begin();
            repository.insertDailyCheckin(seniorId, question, answer, answeredAt);
            transaction.commit();

            DailyCheckinResponse response = new DailyCheckinResponse(
                    "Reponse enregistree.",
                    new DailyCheckinResponse.CheckinData(
                            seniorId,
                            question,
                            displayAnswer,
                            formatDateTime(answeredAt)
                    )
            );
            RealtimeEventBus.publish("checkin:answered", seniorId, actor, response.getCheckin());
            return response;
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

    public SosAlertResponse triggerSos(AuthenticatedUser actor, SosAlertRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        String comment = normalizeOptional(request.getComment());
        LocalDateTime triggeredAt = LocalDateTime.now();

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();

        try {
            Long seniorId = seniorAccessResolver.resolveSeniorOwnerId(entityManager, actor);
            SeniorHomeRepository repository = new SeniorHomeRepository(entityManager);
            ensureSeniorExists(repository, seniorId);

            Optional<SeniorHomeRepository.SosAlertProjection> latestActiveAlert =
                    repository.findLatestActiveSosAlert(seniorId);
            if (latestActiveAlert.isPresent() && isWithinSosRepeatWindow(latestActiveAlert.get(), triggeredAt)) {
                return buildSosAlertResponse(
                        "Alerte SOS deja active. Votre famille a deja ete notifiee.",
                        seniorId,
                        latestActiveAlert.get(),
                        true
                );
            }

            transaction.begin();
            repository.insertSosAlert(seniorId, triggeredAt, comment);
            transaction.commit();

            SeniorHomeRepository.SosAlertProjection alert = repository.findLatestSosAlert(seniorId)
                    .orElse(new SeniorHomeRepository.SosAlertProjection(null, triggeredAt, "triggered", comment));

            SosAlertResponse response = buildSosAlertResponse("Alerte SOS declenchee.", seniorId, alert, false);
            RealtimeEventBus.publish("sos:triggered", seniorId, actor, response.getAlert());
            return response;
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

    private boolean isWithinSosRepeatWindow(SeniorHomeRepository.SosAlertProjection alert, LocalDateTime now) {
        if (alert == null || alert.getTriggeredAt() == null) {
            return false;
        }
        long elapsedMinutes = Duration.between(alert.getTriggeredAt(), now).toMinutes();
        return elapsedMinutes >= 0 && elapsedMinutes < SOS_REPEAT_WINDOW_MINUTES;
    }

    private SosAlertResponse buildSosAlertResponse(String message, Long seniorId,
                                                   SeniorHomeRepository.SosAlertProjection alert,
                                                   boolean alreadyActive) {
        return new SosAlertResponse(
                message,
                new SosAlertResponse.AlertData(
                        alert.getId(),
                        seniorId,
                        normalizeStatus(alert.getStatus()),
                        formatDateTime(alert.getTriggeredAt()),
                        alert.getComment()
                ),
                alreadyActive
        );
    }

    private HomeResponse.MedicationItem mapMedicationItem(
            SeniorHomeRepository.MedicationProjection medication,
            SeniorHomeRepository.MedicationTakeProjection take,
            LocalDate targetDate,
            LocalDateTime now) {
        LocalDateTime scheduledAt = LocalDateTime.of(targetDate, medication.getScheduledTime());
        String status = resolveMedicationStatus(targetDate, scheduledAt, take, now);

        return new HomeResponse.MedicationItem(
                medication.getId(),
                medication.getName(),
                medication.getDosage(),
                formatTime(medication.getScheduledTime()),
                medication.getFrequency(),
                medication.getPeriod(),
                medication.getInstruction(),
                status,
                formatDateTime(scheduledAt),
                take == null ? null : formatDateTime(take.getTakenAt())
        );
    }

    private HomeResponse.NextMedication buildNextMedication(
            List<HomeResponse.MedicationItem> medicationItems,
            LocalDate targetDate,
            LocalDateTime now) {
        List<HomeResponse.MedicationItem> notTaken = medicationItems.stream()
                .filter(item -> !"taken".equalsIgnoreCase(item.getStatus()))
                .toList();

        if (notTaken.isEmpty()) {
            return null;
        }

        Optional<HomeResponse.MedicationItem> upcoming = notTaken.stream()
                .filter(item -> parseDateTime(item.getScheduledAt(), "scheduledAt").isAfter(now)
                        || parseDateTime(item.getScheduledAt(), "scheduledAt").isEqual(now))
                .min(Comparator.comparing(item -> parseDateTime(item.getScheduledAt(), "scheduledAt")));

        HomeResponse.MedicationItem selected = upcoming.orElseGet(() ->
                notTaken.stream()
                        .min(Comparator.comparing(item -> parseDateTime(item.getScheduledAt(), "scheduledAt")))
                        .orElse(null)
        );

        if (selected == null) {
            return null;
        }

        Integer countdownMinutes = null;
        String countdownText = null;

        if (targetDate.equals(LocalDate.now())) {
            LocalDateTime scheduledAt = parseDateTime(selected.getScheduledAt(), "scheduledAt");
            long minuteDiff = Duration.between(now, scheduledAt).toMinutes();
            countdownMinutes = (int) Math.abs(minuteDiff);
            countdownText = formatCountdown(minuteDiff);
        }

        return new HomeResponse.NextMedication(
                selected.getId(),
                selected.getName(),
                selected.getDosage(),
                selected.getTime(),
                selected.getScheduledAt(),
                selected.getStatus(),
                countdownMinutes,
                countdownText
        );
    }

    private String resolveMedicationStatus(
            LocalDate targetDate,
            LocalDateTime scheduledAt,
            SeniorHomeRepository.MedicationTakeProjection take,
            LocalDateTime now) {
        if (take != null && hasText(take.getStatus())) {
            return normalizeStatus(take.getStatus());
        }

        LocalDate today = LocalDate.now();
        if (targetDate.isBefore(today)) {
            return "missed";
        }
        if (targetDate.isAfter(today)) {
            return "upcoming";
        }
        return scheduledAt.isAfter(now) ? "upcoming" : "pending";
    }

    private List<CheckinProfile> resolveActiveCheckinProfiles(LocalTime time) {
        if (time != null && time.getHour() < MORNING_SESSION_END_HOUR) {
            return MORNING_PROFILES;
        }
        return EVENING_PROFILES;
    }

    private CheckinProfile resolveCheckinProfileByQuestion(String question, LocalTime time) {
        if (!hasText(question)) {
            return resolveActiveCheckinProfiles(time).getFirst();
        }

        String normalized = question.trim();
        for (CheckinProfile profile : ALL_CHECKIN_PROFILES) {
            if (equalsIgnoreCase(normalized, profile.question())) {
                return profile;
            }
        }
        return resolveActiveCheckinProfiles(time).getFirst();
    }

    private String mapDisplayOrCanonicalAnswerToStoredValue(String answer, CheckinProfile profile) {
        if (!hasText(answer)) {
            throw new ApiException(Response.Status.BAD_REQUEST, "answer is required.");
        }

        String normalized = answer.trim();

        for (int index = 0; index < profile.options().size(); index++) {
            String option = profile.options().get(index);
            String storedAnswer = profile.storedAnswers().get(index);
            if (equalsIgnoreCase(option, normalized) || equalsIgnoreCase(storedAnswer, normalized)) {
                return storedAnswer;
            }

            if (index < profile.legacyAnswers().size()
                    && equalsIgnoreCase(profile.legacyAnswers().get(index), normalized)) {
                return storedAnswer;
            }
        }

        throw new ApiException(
                Response.Status.BAD_REQUEST,
                "answer must be one of: " + String.join(", ", profile.options()) + "."
        );
    }

    private String mapStoredAnswerToDisplay(String answer, CheckinProfile profile) {
        if (!hasText(answer)) {
            return null;
        }

        String normalized = answer.trim();
        for (int index = 0; index < profile.options().size(); index++) {
            if (equalsIgnoreCase(profile.options().get(index), normalized)
                    || equalsIgnoreCase(profile.storedAnswers().get(index), normalized)) {
                return profile.options().get(index);
            }
            if (index < profile.legacyAnswers().size()
                    && equalsIgnoreCase(profile.legacyAnswers().get(index), normalized)) {
                return profile.options().get(index);
            }
        }
        return answer;
    }

    private String normalizeStatus(String status) {
        if (!hasText(status)) {
            return status;
        }
        return status.trim().toLowerCase(Locale.ROOT);
    }

    private LocalDate parseDateOrToday(String value) {
        if (!hasText(value)) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(value.trim(), DATE_FORMATTER);
        } catch (DateTimeParseException exception) {
            throw new ApiException(Response.Status.BAD_REQUEST, "date must use YYYY-MM-DD format.");
        }
    }

    private LocalDateTime parseDateTime(String value, String fieldName) {
        if (!hasText(value)) {
            throw new ApiException(Response.Status.BAD_REQUEST, fieldName + " is required.");
        }

        String trimmed = value.trim();
        try {
            return LocalDateTime.parse(trimmed, DateTimeFormatter.ISO_DATE_TIME);
        } catch (DateTimeParseException firstException) {
            try {
                return OffsetDateTime.parse(trimmed, DateTimeFormatter.ISO_DATE_TIME).toLocalDateTime();
            } catch (DateTimeParseException secondException) {
                throw new ApiException(Response.Status.BAD_REQUEST, fieldName + " must be ISO datetime.");
            }
        }
    }

    private SeniorHomeRepository.SeniorProjection ensureSeniorExists(SeniorHomeRepository repository, Long seniorId) {
        return repository.findSenior(seniorId)
                .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Senior not found."));
    }

    private void validateSeniorId(Long seniorId) {
        if (seniorId == null || seniorId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "seniorId is required.");
        }
    }

    private String formatCountdown(long minuteDiff) {
        if (minuteDiff > 0) {
            return "Dans " + minuteDiff + " min";
        }
        if (minuteDiff < 0) {
            return "En retard de " + Math.abs(minuteDiff) + " min";
        }
        return "Maintenant";
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.format(DATE_TIME_FORMATTER);
    }

    private String formatTime(java.time.LocalTime value) {
        if (value == null) {
            return null;
        }
        return value.format(TIME_FORMATTER);
    }

    private String normalizeOptional(String value) {
        if (!hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private String capitalizeFirst(String value) {
        if (!hasText(value)) {
            return value;
        }
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private void rollback(EntityTransaction transaction) {
        if (transaction != null && transaction.isActive()) {
            transaction.rollback();
        }
    }

    private record CheckinProfile(String question, List<String> options,
                                  List<String> storedAnswers, List<String> legacyAnswers) {
    }
}
