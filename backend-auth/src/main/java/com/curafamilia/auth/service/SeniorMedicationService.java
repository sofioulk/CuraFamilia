package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.SeniorMedicationsResponse;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.repository.SeniorMedicationRepository;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.core.Response;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class SeniorMedicationService {
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final Set<String> SUPPORTED_PERIODS = Set.of("all", "matin", "midi", "soir", "ponctuel");
    private static final Map<String, String> PERIOD_LABELS = Map.of(
            "matin", "Matin",
            "midi", "Midi",
            "soir", "Soir",
            "ponctuel", "Ponctuel"
    );

    public SeniorMedicationsResponse getMedications(Long seniorId, String periodValue) {
        validateSeniorId(seniorId);
        String normalizedPeriod = normalizePeriod(periodValue);

        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            SeniorMedicationRepository repository = new SeniorMedicationRepository(entityManager);
            ensureSeniorExists(repository, seniorId);

            LocalDate targetDate = LocalDate.now();
            LocalDateTime now = LocalDateTime.now();
            List<SeniorMedicationRepository.MedicationProjection> allMedications = repository
                    .findActiveMedications(seniorId, null);
            int totalActiveCount = allMedications.size();
            Map<Long, SeniorMedicationRepository.MedicationTakeProjection> takesByMedicationId =
                    repository.findMedicationTakesForDate(seniorId, targetDate);

            List<SeniorMedicationRepository.MedicationProjection> medications = "all".equals(normalizedPeriod)
                    ? allMedications
                    : allMedications.stream()
                    .filter(medication -> normalizedPeriod.equalsIgnoreCase(
                            String.valueOf(medication.getPeriod()).trim()
                    ))
                    .toList();

            List<SeniorMedicationsResponse.MedicationItem> medicationItems = medications.stream()
                    .map(medication -> toMedicationItem(
                            medication,
                            takesByMedicationId.get(medication.getId()),
                            targetDate,
                            now
                    ))
                    .toList();

            int takenCount = (int) allMedications.stream()
                    .filter(medication -> isTaken(takesByMedicationId.get(medication.getId())))
                    .count();

            return new SeniorMedicationsResponse(totalActiveCount, takenCount, normalizedPeriod, medicationItems);
        } finally {
            entityManager.close();
        }
    }

    private SeniorMedicationsResponse.MedicationItem toMedicationItem(
            SeniorMedicationRepository.MedicationProjection medication,
            SeniorMedicationRepository.MedicationTakeProjection take,
            LocalDate targetDate,
            LocalDateTime now) {
        LocalDateTime scheduledAt = LocalDateTime.of(targetDate, medication.getScheduledTime());
        String status = resolveMedicationStatus(scheduledAt, take, now);

        return new SeniorMedicationsResponse.MedicationItem(
                medication.getId(),
                medication.getName(),
                medication.getDosage(),
                normalizePeriodLabel(medication.getPeriod()),
                formatTime(medication.getScheduledTime()),
                medication.getFrequency(),
                medication.getInstruction(),
                medication.isActive(),
                status,
                take == null ? null : formatDateTime(take.getTakenAt())
        );
    }

    private SeniorMedicationRepository.SeniorProjection ensureSeniorExists(SeniorMedicationRepository repository,
                                                                           Long seniorId) {
        return repository.findSenior(seniorId)
                .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Senior not found."));
    }

    private void validateSeniorId(Long seniorId) {
        if (seniorId == null || seniorId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "seniorId is required.");
        }
    }

    private String normalizePeriod(String periodValue) {
        if (!hasText(periodValue)) {
            return "all";
        }

        String normalized = periodValue.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_PERIODS.contains(normalized)) {
            throw new ApiException(
                    Response.Status.BAD_REQUEST,
                    "period must be one of: all, matin, midi, soir, ponctuel."
            );
        }

        return normalized;
    }

    private String normalizePeriodLabel(String periodValue) {
        if (!hasText(periodValue)) {
            return periodValue;
        }

        String normalized = periodValue.trim().toLowerCase(Locale.ROOT);
        return PERIOD_LABELS.getOrDefault(normalized, periodValue.trim());
    }

    private String formatTime(LocalTime time) {
        if (time == null) {
            return null;
        }
        return time.format(TIME_FORMATTER);
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.format(DATE_TIME_FORMATTER);
    }

    private String resolveMedicationStatus(LocalDateTime scheduledAt,
                                           SeniorMedicationRepository.MedicationTakeProjection take,
                                           LocalDateTime now) {
        if (take != null && hasText(take.getStatus())) {
            return normalizeStatus(take.getStatus());
        }
        return scheduledAt.isAfter(now) ? "upcoming" : "pending";
    }

    private boolean isTaken(SeniorMedicationRepository.MedicationTakeProjection take) {
        if (take == null) {
            return false;
        }
        return "taken".equalsIgnoreCase(normalizeStatus(take.getStatus())) || take.getTakenAt() != null;
    }

    private String normalizeStatus(String value) {
        if (!hasText(value)) {
            return value;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
