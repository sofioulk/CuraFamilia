package com.curafamilia.auth.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class SeniorMedicationRepository {
    private final EntityManager entityManager;

    public SeniorMedicationRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Optional<SeniorProjection> findSenior(Long seniorId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, name " +
                                "FROM users " +
                                "WHERE id = :seniorId AND role = 'senior' AND is_active = 1 " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = rows.getFirst();
        return Optional.of(new SeniorProjection(
                toLong(row[0]),
                toStringValue(row[1])
        ));
    }

    public int countActiveMedications(Long seniorId) {
        Object result = entityManager.createNativeQuery(
                        "SELECT COUNT(*) " +
                                "FROM medications " +
                                "WHERE senior_id = :seniorId AND is_active = 1")
                .setParameter("seniorId", seniorId)
                .getSingleResult();

        return toInt(result);
    }

    public List<MedicationProjection> findActiveMedications(Long seniorId, String normalizedPeriod) {
        StringBuilder sql = new StringBuilder(
                "SELECT id, name, dosage, period, scheduled_time, frequency, instruction, is_active " +
                        "FROM medications " +
                        "WHERE senior_id = :seniorId AND is_active = 1 "
        );

        if (normalizedPeriod != null) {
            sql.append("AND LOWER(TRIM(period)) = :period ");
        }

        sql.append("ORDER BY scheduled_time ASC, id ASC");

        Query query = entityManager.createNativeQuery(sql.toString())
                .setParameter("seniorId", seniorId);

        if (normalizedPeriod != null) {
            query.setParameter("period", normalizedPeriod);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();

        return rows.stream()
                .map(row -> new MedicationProjection(
                        toLong(row[0]),
                        toStringValue(row[1]),
                        toStringValue(row[2]),
                        toStringValue(row[3]),
                        toLocalTime(row[4]),
                        toStringValue(row[5]),
                        toStringValue(row[6]),
                        toBoolean(row[7])
                ))
                .toList();
    }

    public Map<Long, MedicationTakeProjection> findMedicationTakesForDate(Long seniorId, LocalDate targetDate) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT medication_id, scheduled_at, taken_at, status " +
                                "FROM medication_takes " +
                                "WHERE senior_id = :seniorId AND DATE(scheduled_at) = :targetDate")
                .setParameter("seniorId", seniorId)
                .setParameter("targetDate", Date.valueOf(targetDate))
                .getResultList();

        Map<Long, MedicationTakeProjection> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            MedicationTakeProjection projection = new MedicationTakeProjection(
                    toLong(row[0]),
                    toLocalDateTime(row[1]),
                    toLocalDateTime(row[2]),
                    toStringValue(row[3])
            );
            result.put(projection.getMedicationId(), projection);
        }
        return result;
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private int toInt(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private String toStringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private LocalTime toLocalTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalTime localTime) {
            return localTime;
        }
        if (value instanceof Time time) {
            return time.toLocalTime();
        }
        return LocalTime.parse(value.toString());
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof java.util.Date date) {
            return LocalDateTime.ofInstant(date.toInstant(), java.time.ZoneId.systemDefault());
        }
        return LocalDateTime.parse(value.toString().replace(' ', 'T'));
    }

    private boolean toBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        String normalized = value.toString().trim();
        return "1".equals(normalized) || "true".equalsIgnoreCase(normalized);
    }

    public static class SeniorProjection {
        private final Long id;
        private final String name;

        public SeniorProjection(Long id, String name) {
            this.id = id;
            this.name = name;
        }

        public Long getId() {
            return id;
        }

        public String getName() {
            return name;
        }
    }

    public static class MedicationProjection {
        private final Long id;
        private final String name;
        private final String dosage;
        private final String period;
        private final LocalTime scheduledTime;
        private final String frequency;
        private final String instruction;
        private final boolean active;

        public MedicationProjection(Long id, String name, String dosage, String period, LocalTime scheduledTime,
                                    String frequency, String instruction, boolean active) {
            this.id = id;
            this.name = name;
            this.dosage = dosage;
            this.period = period;
            this.scheduledTime = scheduledTime;
            this.frequency = frequency;
            this.instruction = instruction;
            this.active = active;
        }

        public Long getId() {
            return id;
        }

        public String getName() {
            return name;
        }

        public String getDosage() {
            return dosage;
        }

        public String getPeriod() {
            return period;
        }

        public LocalTime getScheduledTime() {
            return scheduledTime;
        }

        public String getFrequency() {
            return frequency;
        }

        public String getInstruction() {
            return instruction;
        }

        public boolean isActive() {
            return active;
        }
    }

    public static class MedicationTakeProjection {
        private final Long medicationId;
        private final LocalDateTime scheduledAt;
        private final LocalDateTime takenAt;
        private final String status;

        public MedicationTakeProjection(Long medicationId, LocalDateTime scheduledAt,
                                        LocalDateTime takenAt, String status) {
            this.medicationId = medicationId;
            this.scheduledAt = scheduledAt;
            this.takenAt = takenAt;
            this.status = status;
        }

        public Long getMedicationId() {
            return medicationId;
        }

        public LocalDateTime getScheduledAt() {
            return scheduledAt;
        }

        public LocalDateTime getTakenAt() {
            return takenAt;
        }

        public String getStatus() {
            return status;
        }
    }
}
