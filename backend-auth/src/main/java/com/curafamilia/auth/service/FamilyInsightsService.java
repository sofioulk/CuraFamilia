package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.AdherenceTrendResponse;
import com.curafamilia.auth.dto.FamilyDashboardResponse;
import com.curafamilia.auth.dto.HealthScoreResponse;
import com.curafamilia.auth.dto.MoodTrendResponse;
import com.curafamilia.auth.repository.FamilyInsightsRepository;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.security.SeniorAccessResolver;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

public class FamilyInsightsService {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final SeniorAccessResolver seniorAccessResolver = new SeniorAccessResolver();

    public AdherenceTrendResponse getAdherenceTrend(AuthenticatedUser actor, Long requestedSeniorId, Integer requestedDays) {
        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);
            int days = normalizeDays(requestedDays);
            FamilyInsightsRepository repository = new FamilyInsightsRepository(entityManager);
            MetricsContext context = loadMetricsContext(repository, seniorId, days);
            return buildAdherenceResponse(seniorId, days, context);
        } finally {
            entityManager.close();
        }
    }

    public MoodTrendResponse getMoodTrend(AuthenticatedUser actor, Long requestedSeniorId, Integer requestedDays) {
        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);
            int days = normalizeDays(requestedDays);
            FamilyInsightsRepository repository = new FamilyInsightsRepository(entityManager);
            MetricsContext context = loadMetricsContext(repository, seniorId, days);
            return buildMoodResponse(seniorId, days, context);
        } finally {
            entityManager.close();
        }
    }

    public HealthScoreResponse getHealthScore(AuthenticatedUser actor, Long requestedSeniorId) {
        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);
            FamilyInsightsRepository repository = new FamilyInsightsRepository(entityManager);
            MetricsContext context = loadMetricsContext(repository, seniorId, 7);
            return buildHealthScoreResponse(seniorId, context);
        } finally {
            entityManager.close();
        }
    }

    public FamilyDashboardResponse getDashboard(AuthenticatedUser actor, Long requestedSeniorId) {
        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);
            FamilyInsightsRepository repository = new FamilyInsightsRepository(entityManager);
            MetricsContext context = loadMetricsContext(repository, seniorId, 7);
            return buildDashboardResponse(seniorId, repository, context);
        } finally {
            entityManager.close();
        }
    }

    private MetricsContext loadMetricsContext(FamilyInsightsRepository repository, Long seniorId, int days) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1L);
        LocalDateTime fromDateTime = startDate.atStartOfDay();
        LocalDateTime toDateTime = endDate.plusDays(1L).atStartOfDay();

        List<FamilyInsightsRepository.MedicationScheduleProjection> medicationSchedules = repository.findMedicationSchedules(seniorId);
        List<FamilyInsightsRepository.MedicationTakeProjection> medicationTakes = repository.findMedicationTakesBetween(seniorId, fromDateTime, toDateTime);
        List<FamilyInsightsRepository.DailyCheckinProjection> checkins = repository.findDailyCheckinsBetween(seniorId, fromDateTime, toDateTime);
        List<FamilyInsightsRepository.DailySummaryProjection> summaries = repository.findDailySummariesBetween(seniorId, startDate, endDate);
        List<FamilyInsightsRepository.AppointmentProjection> appointments = repository.findAppointmentsBetween(seniorId, fromDateTime.minusDays(23), toDateTime.plusDays(30));
        List<FamilyInsightsRepository.SosAlertProjection> sosAlerts = repository.findSosAlertsBetween(seniorId, fromDateTime.minusDays(23), toDateTime.plusDays(1));

        Map<LocalDate, List<FamilyInsightsRepository.MedicationTakeProjection>> takesByDate = new LinkedHashMap<>();
        for (FamilyInsightsRepository.MedicationTakeProjection projection : medicationTakes) {
            LocalDate date = projection.getScheduledAt().toLocalDate();
            takesByDate.computeIfAbsent(date, ignored -> new ArrayList<>()).add(projection);
        }

        Map<LocalDate, List<FamilyInsightsRepository.DailyCheckinProjection>> checkinsByDate = new LinkedHashMap<>();
        for (FamilyInsightsRepository.DailyCheckinProjection projection : checkins) {
            LocalDate date = projection.getAnsweredAt().toLocalDate();
            checkinsByDate.computeIfAbsent(date, ignored -> new ArrayList<>()).add(projection);
        }

        Map<LocalDate, FamilyInsightsRepository.DailySummaryProjection> summariesByDate = new HashMap<>();
        for (FamilyInsightsRepository.DailySummaryProjection summary : summaries) {
            summariesByDate.put(summary.getSummaryDate(), summary);
        }

        return new MetricsContext(
                startDate,
                endDate,
                medicationSchedules,
                takesByDate,
                checkinsByDate,
                summariesByDate,
                appointments,
                sosAlerts
        );
    }

    private AdherenceTrendResponse buildAdherenceResponse(Long seniorId, int days, MetricsContext context) {
        List<AdherenceTrendResponse.Day> timeline = new ArrayList<>();
        int totalScheduled = 0;
        int totalTaken = 0;

        for (LocalDate date = context.startDate; !date.isAfter(context.endDate); date = date.plusDays(1L)) {
            int scheduledCount = countScheduledForDate(context.medicationSchedules, date);
            int takenCount = countTakenForDate(context.takesByDate.getOrDefault(date, List.of()));
            totalScheduled += scheduledCount;
            totalTaken += takenCount;
            timeline.add(new AdherenceTrendResponse.Day(
                    date.format(DATE_FORMATTER),
                    scheduledCount,
                    takenCount,
                    percentage(takenCount, scheduledCount)
            ));
        }

        return new AdherenceTrendResponse(
                seniorId,
                days,
                new AdherenceTrendResponse.Summary(totalScheduled, totalTaken, percentage(totalTaken, totalScheduled)),
                timeline
        );
    }

    private MoodTrendResponse buildMoodResponse(Long seniorId, int days, MetricsContext context) {
        List<MoodTrendResponse.Day> timeline = new ArrayList<>();
        for (LocalDate date = context.startDate; !date.isAfter(context.endDate); date = date.plusDays(1L)) {
            List<FamilyInsightsRepository.DailyCheckinProjection> checkins = context.checkinsByDate.getOrDefault(date, List.of());
            FamilyInsightsRepository.DailySummaryProjection summary = context.summariesByDate.get(date);
            double moodScore = summary != null && hasText(summary.getMood())
                    ? mapSummaryMoodScore(summary.getMood())
                    : deriveMoodScore(checkins);
            String moodLabel = summary != null && hasText(summary.getMood())
                    ? humanizeSummaryMood(summary.getMood())
                    : labelForMoodScore(moodScore);

            String latestAnswer = checkins.stream()
                    .max(Comparator.comparing(FamilyInsightsRepository.DailyCheckinProjection::getAnsweredAt))
                    .map(FamilyInsightsRepository.DailyCheckinProjection::getAnswer)
                    .orElse(null);

            timeline.add(new MoodTrendResponse.Day(
                    date.format(DATE_FORMATTER),
                    checkins.size(),
                    roundOneDecimal(moodScore),
                    moodLabel,
                    latestAnswer,
                    summary == null ? null : summary.getSummaryText()
            ));
        }
        return new MoodTrendResponse(seniorId, days, timeline);
    }

    private HealthScoreResponse buildHealthScoreResponse(Long seniorId, MetricsContext context) {
        AdherenceTrendResponse adherence = buildAdherenceResponse(seniorId, 7, context);
        MoodTrendResponse mood = buildMoodResponse(seniorId, 7, context);

        double adherencePercentage = adherence.getSummary().getPercentage();
        long answeredDays = mood.getTimeline().stream()
                .filter(day -> day.getCheckinsCount() != null && day.getCheckinsCount() > 0)
                .count();
        double checkinCompletionPercentage = (answeredDays / 7.0) * 100.0;
        double averageMoodScore = mood.getTimeline().stream()
                .map(MoodTrendResponse.Day::getMoodScore)
                .filter(score -> score != null && score > 0)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(2.0);
        double moodPercentage = ((averageMoodScore - 1.0) / 2.0) * 100.0;
        String activeSosStatus = context.sosAlerts.stream()
                .filter(alert -> !"resolved".equalsIgnoreCase(alert.getStatus()))
                .max(Comparator.comparing(FamilyInsightsRepository.SosAlertProjection::getTriggeredAt))
                .map(FamilyInsightsRepository.SosAlertProjection::getStatus)
                .orElse(null);
        double sosSafetyPercentage = activeSosStatus == null
                ? 100.0
                : ("acknowledged".equalsIgnoreCase(activeSosStatus) ? 60.0 : 0.0);

        int score = (int) Math.round(
                (adherencePercentage * 0.5)
                        + (checkinCompletionPercentage * 0.2)
                        + (moodPercentage * 0.2)
                        + (sosSafetyPercentage * 0.1)
        );
        String status = score >= 80 ? "strong" : (score >= 60 ? "stable" : "needs_attention");

        return new HealthScoreResponse(
                seniorId,
                score,
                status,
                "score = adherence*0.50 + checkin_completion*0.20 + mood*0.20 + sos_safety*0.10 over the last 7 days",
                new HealthScoreResponse.Breakdown(
                        roundOneDecimal(adherencePercentage),
                        roundOneDecimal(checkinCompletionPercentage),
                        roundOneDecimal(averageMoodScore),
                        roundOneDecimal(moodPercentage),
                        roundOneDecimal(sosSafetyPercentage)
                )
        );
    }

    private FamilyDashboardResponse buildDashboardResponse(Long seniorId,
                                                           FamilyInsightsRepository repository,
                                                           MetricsContext context) {
        FamilyInsightsRepository.SeniorOverviewProjection overview = repository.findSeniorOverview(seniorId).orElse(null);
        var nextAppointment = repository.findNextAppointment(seniorId, LocalDateTime.now());
        var activeSos = repository.findLatestActiveSosAlert(seniorId);
        HealthScoreResponse healthScore = buildHealthScoreResponse(seniorId, context);
        MoodTrendResponse moodTrend = buildMoodResponse(seniorId, 7, context);
        AdherenceTrendResponse adherence = buildAdherenceResponse(seniorId, 7, context);

        List<FamilyDashboardResponse.MoodStripItem> moodStrip = moodTrend.getTimeline().stream()
                .map(day -> new FamilyDashboardResponse.MoodStripItem(day.getDate(), day.getMoodScore(), day.getMoodLabel()))
                .toList();

        String currentMoodLabel = moodTrend.getTimeline().isEmpty()
                ? "stable"
                : moodTrend.getTimeline().getLast().getMoodLabel();

        FamilyDashboardResponse.Hero hero = new FamilyDashboardResponse.Hero(
                overview == null ? null : overview.getName(),
                overview == null ? null : overview.getAge(),
                overview == null ? null : overview.getCity(),
                overview == null ? null : overview.getMedicalCondition(),
                overview == null ? null : overview.getBloodType(),
                nextAppointment.map(FamilyInsightsRepository.AppointmentProjection::getAppointmentAt).map(this::formatDateTime).orElse(null),
                activeSos.map(alert -> normalizeStatus(alert.getStatus())).orElse(null),
                currentMoodLabel
        );

        FamilyDashboardResponse.Kpis kpis = new FamilyDashboardResponse.Kpis(
                adherence.getSummary().getPercentage(),
                (int) context.checkinsByDate.values().stream().mapToLong(List::size).sum(),
                healthScore.getScore(),
                (int) context.medicationSchedules.stream().filter(FamilyInsightsRepository.MedicationScheduleProjection::isActive).count(),
                activeSos.isPresent() ? 1 : 0
        );

        return new FamilyDashboardResponse(
                seniorId,
                hero,
                kpis,
                buildTimeline(context),
                moodStrip,
                buildAiSummary(context, adherence, moodTrend, activeSos)
        );
    }

    private int normalizeDays(Integer requestedDays) {
        if (requestedDays == null) {
            return 7;
        }
        if (requestedDays <= 0 || requestedDays > 30) {
            throw new com.curafamilia.auth.exception.ApiException(jakarta.ws.rs.core.Response.Status.BAD_REQUEST,
                    "days must be between 1 and 30.");
        }
        return requestedDays;
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? null : value.format(DATE_TIME_FORMATTER);
    }

    private String normalizeStatus(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private List<FamilyDashboardResponse.TimelineItem> buildTimeline(MetricsContext context) {
        List<TimelineEntry> entries = new ArrayList<>();

        for (FamilyInsightsRepository.MedicationTakeProjection take : context.takesByDate.values().stream().flatMap(List::stream).toList()) {
            LocalDateTime occurredAt = take.getTakenAt() != null ? take.getTakenAt() : take.getScheduledAt();
            entries.add(new TimelineEntry(
                    occurredAt,
                    new FamilyDashboardResponse.TimelineItem(
                            "medication:taken",
                            take.getMedicationName(),
                            "Prise enregistree",
                            formatDateTime(occurredAt),
                            normalizeStatus(take.getStatus())
                    )
            ));
        }

        for (List<FamilyInsightsRepository.DailyCheckinProjection> projections : context.checkinsByDate.values()) {
            for (FamilyInsightsRepository.DailyCheckinProjection projection : projections) {
                entries.add(new TimelineEntry(
                        projection.getAnsweredAt(),
                        new FamilyDashboardResponse.TimelineItem(
                                "checkin:answered",
                                projection.getQuestion(),
                                projection.getAnswer(),
                                formatDateTime(projection.getAnsweredAt()),
                                "answered"
                        )
                ));
            }
        }

        for (FamilyInsightsRepository.SosAlertProjection alert : context.sosAlerts) {
            entries.add(new TimelineEntry(
                    alert.getTriggeredAt(),
                    new FamilyDashboardResponse.TimelineItem(
                            "sos:" + normalizeStatus(alert.getStatus()),
                            "SOS",
                            alert.getComment(),
                            formatDateTime(alert.getTriggeredAt()),
                            normalizeStatus(alert.getStatus())
                    )
            ));
        }

        for (FamilyInsightsRepository.AppointmentProjection appointment : context.appointments) {
            LocalDateTime occurredAt = appointment.getUpdatedAt() != null ? appointment.getUpdatedAt() : appointment.getCreatedAt();
            entries.add(new TimelineEntry(
                    occurredAt,
                    new FamilyDashboardResponse.TimelineItem(
                            "appointment:" + normalizeStatus(appointment.getStatus()),
                            appointment.getSpecialty(),
                            appointment.getDoctorName(),
                            formatDateTime(occurredAt),
                            normalizeStatus(appointment.getStatus())
                    )
            ));
        }

        return entries.stream()
                .sorted(Comparator.comparing(TimelineEntry::occurredAt).reversed())
                .limit(12)
                .map(TimelineEntry::item)
                .toList();
    }

    private FamilyDashboardResponse.AiSummary buildAiSummary(MetricsContext context,
                                                             AdherenceTrendResponse adherence,
                                                             MoodTrendResponse mood,
                                                             Optional<FamilyInsightsRepository.SosAlertProjection> activeSos) {
        FamilyInsightsRepository.DailySummaryProjection latestSummary = context.summariesByDate.values().stream()
                .max(Comparator.comparing(FamilyInsightsRepository.DailySummaryProjection::getSummaryDate))
                .orElse(null);

        if (latestSummary != null && hasText(latestSummary.getSummaryText())) {
            return new FamilyDashboardResponse.AiSummary(
                    LocalDateTime.now().format(DATE_TIME_FORMATTER),
                    "chatbot_daily_summaries",
                    latestSummary.getSummaryText()
            );
        }

        MoodTrendResponse.Day latestMood = mood.getTimeline().isEmpty() ? null : mood.getTimeline().getLast();
        String text = "Adherence 7 jours " + adherence.getSummary().getPercentage() + "%, humeur "
                + (latestMood == null ? "stable" : latestMood.getMoodLabel())
                + ", SOS actif "
                + (activeSos.isPresent() ? normalizeStatus(activeSos.get().getStatus()) : "non")
                + ".";
        return new FamilyDashboardResponse.AiSummary(
                LocalDateTime.now().format(DATE_TIME_FORMATTER),
                "computed_fallback",
                text
        );
    }

    private int countScheduledForDate(List<FamilyInsightsRepository.MedicationScheduleProjection> schedules, LocalDate date) {
        int count = 0;
        for (FamilyInsightsRepository.MedicationScheduleProjection schedule : schedules) {
            if (isMedicationScheduledOnDate(schedule, date)) {
                count += 1;
            }
        }
        return count;
    }

    private boolean isMedicationScheduledOnDate(FamilyInsightsRepository.MedicationScheduleProjection schedule, LocalDate date) {
        if (schedule.getCreatedAt() != null && schedule.getCreatedAt().toLocalDate().isAfter(date)) {
            return false;
        }
        if (schedule.isActive()) {
            return true;
        }
        return schedule.getUpdatedAt() != null && !schedule.getUpdatedAt().toLocalDate().isBefore(date);
    }

    private int countTakenForDate(List<FamilyInsightsRepository.MedicationTakeProjection> takes) {
        return (int) takes.stream()
                .filter(take -> take.getTakenAt() != null || "taken".equalsIgnoreCase(normalizeStatus(take.getStatus())))
                .map(FamilyInsightsRepository.MedicationTakeProjection::getMedicationId)
                .distinct()
                .count();
    }

    private double deriveMoodScore(List<FamilyInsightsRepository.DailyCheckinProjection> checkins) {
        if (checkins == null || checkins.isEmpty()) {
            return 2.0;
        }
        return checkins.stream()
                .mapToDouble(this::mapCheckinScore)
                .average()
                .orElse(2.0);
    }

    private double mapCheckinScore(FamilyInsightsRepository.DailyCheckinProjection checkin) {
        String question = normalizeText(checkin.getQuestion());
        String answer = normalizeText(checkin.getAnswer());

        if (question.contains("effets indesirables")) {
            return answer.contains("non") ? 3.0 : 1.0;
        }
        if (question.contains("bien dormi")) {
            if (answer.contains("oui")) {
                return 3.0;
            }
            if (answer.contains("pas vraiment")) {
                return 2.0;
            }
            return 1.0;
        }
        if (answer.contains("bien") || answer.contains("oui")) {
            return 3.0;
        }
        if (answer.contains("moyen") || answer.contains("moyenne") || answer.contains("pas vraiment")) {
            return 2.0;
        }
        if (answer.contains("difficile") || answer.contains("non")) {
            return 1.0;
        }
        return 2.0;
    }

    private double mapSummaryMoodScore(String mood) {
        String normalized = normalizeStatus(mood);
        return switch (normalized) {
            case "plutot_bien" -> 3.0;
            case "stable" -> 2.5;
            case "fatigue" -> 2.0;
            case "inconfort" -> 1.8;
            case "besoin_de_presence" -> 1.5;
            case "a_surveiller" -> 1.0;
            default -> 2.0;
        };
    }

    private String humanizeSummaryMood(String mood) {
        String normalized = normalizeStatus(mood);
        return switch (normalized) {
            case "plutot_bien" -> "Plutôt bien";
            case "stable" -> "Stable";
            case "fatigue" -> "Fatigué(e)";
            case "inconfort" -> "Inconfort";
            case "besoin_de_presence" -> "Besoin de présence";
            case "a_surveiller" -> "À surveiller";
            default -> "Stable";
        };
    }

    private String labelForMoodScore(double moodScore) {
        if (moodScore >= 2.5) {
            return "plutot_bien";
        }
        if (moodScore >= 1.75) {
            return "stable";
        }
        return "a_surveiller";
    }

    private double percentage(int numerator, int denominator) {
        if (denominator <= 0) {
            return 0.0;
        }
        return roundOneDecimal((numerator * 100.0) / denominator);
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record TimelineEntry(LocalDateTime occurredAt, FamilyDashboardResponse.TimelineItem item) {
    }

    private record MetricsContext(
            LocalDate startDate,
            LocalDate endDate,
            List<FamilyInsightsRepository.MedicationScheduleProjection> medicationSchedules,
            Map<LocalDate, List<FamilyInsightsRepository.MedicationTakeProjection>> takesByDate,
            Map<LocalDate, List<FamilyInsightsRepository.DailyCheckinProjection>> checkinsByDate,
            Map<LocalDate, FamilyInsightsRepository.DailySummaryProjection> summariesByDate,
            List<FamilyInsightsRepository.AppointmentProjection> appointments,
            List<FamilyInsightsRepository.SosAlertProjection> sosAlerts
    ) {
    }
}
