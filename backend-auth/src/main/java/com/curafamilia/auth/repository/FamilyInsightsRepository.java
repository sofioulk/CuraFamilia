package com.curafamilia.auth.repository;

import jakarta.persistence.EntityManager;
import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public class FamilyInsightsRepository {
    private final EntityManager entityManager;

    public FamilyInsightsRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Optional<SeniorOverviewProjection> findSeniorOverview(Long seniorId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, name, age, city, medical_condition, blood_type, email " +
                                "FROM users WHERE id = :seniorId AND role = 'senior' AND is_active = 1 LIMIT 1")
                .setParameter("seniorId", seniorId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Object[] row = rows.getFirst();
        return Optional.of(new SeniorOverviewProjection(
                toLong(row[0]),
                toStringValue(row[1]),
                toInteger(row[2]),
                toStringValue(row[3]),
                toStringValue(row[4]),
                toStringValue(row[5]),
                toStringValue(row[6])
        ));
    }

    public List<MedicationScheduleProjection> findMedicationSchedules(Long seniorId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, name, dosage, is_active, created_at, updated_at " +
                                "FROM medications WHERE senior_id = :seniorId")
                .setParameter("seniorId", seniorId)
                .getResultList();

        return rows.stream()
                .map(row -> new MedicationScheduleProjection(
                        toLong(row[0]),
                        toStringValue(row[1]),
                        toStringValue(row[2]),
                        toBoolean(row[3]),
                        toLocalDateTime(row[4]),
                        toLocalDateTime(row[5])
                ))
                .toList();
    }

    public List<MedicationTakeProjection> findMedicationTakesBetween(Long seniorId, LocalDateTime from, LocalDateTime to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT mt.medication_id, m.name, mt.scheduled_at, mt.taken_at, mt.status " +
                                "FROM medication_takes mt " +
                                "JOIN medications m ON m.id = mt.medication_id " +
                                "WHERE mt.senior_id = :seniorId " +
                                "AND mt.scheduled_at >= :fromDate " +
                                "AND mt.scheduled_at < :toDate " +
                                "ORDER BY mt.scheduled_at DESC, mt.id DESC")
                .setParameter("seniorId", seniorId)
                .setParameter("fromDate", Timestamp.valueOf(from))
                .setParameter("toDate", Timestamp.valueOf(to))
                .getResultList();

        return rows.stream()
                .map(row -> new MedicationTakeProjection(
                        toLong(row[0]),
                        toStringValue(row[1]),
                        toLocalDateTime(row[2]),
                        toLocalDateTime(row[3]),
                        toStringValue(row[4])
                ))
                .toList();
    }

    public List<DailyCheckinProjection> findDailyCheckinsBetween(Long seniorId, LocalDateTime from, LocalDateTime to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT question, answer, answered_at " +
                                "FROM daily_checkins " +
                                "WHERE senior_id = :seniorId " +
                                "AND answered_at >= :fromDate " +
                                "AND answered_at < :toDate " +
                                "ORDER BY answered_at DESC, id DESC")
                .setParameter("seniorId", seniorId)
                .setParameter("fromDate", Timestamp.valueOf(from))
                .setParameter("toDate", Timestamp.valueOf(to))
                .getResultList();

        return rows.stream()
                .map(row -> new DailyCheckinProjection(
                        toStringValue(row[0]),
                        toStringValue(row[1]),
                        toLocalDateTime(row[2])
                ))
                .toList();
    }

    public List<DailySummaryProjection> findDailySummariesBetween(Long seniorId, LocalDate from, LocalDate to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT summary_date, mood, pain, medication_topic, appointment_topic, needs_attention, summary_text " +
                                "FROM chatbot_daily_summaries " +
                                "WHERE senior_id = :seniorId " +
                                "AND summary_date >= :fromDate " +
                                "AND summary_date <= :toDate " +
                                "ORDER BY summary_date DESC")
                .setParameter("seniorId", seniorId)
                .setParameter("fromDate", Date.valueOf(from))
                .setParameter("toDate", Date.valueOf(to))
                .getResultList();

        return rows.stream()
                .map(row -> new DailySummaryProjection(
                        toLocalDate(row[0]),
                        toStringValue(row[1]),
                        toStringValue(row[2]),
                        toBoolean(row[3]),
                        toBoolean(row[4]),
                        toBoolean(row[5]),
                        toStringValue(row[6])
                ))
                .toList();
    }

    public Optional<DailySummaryProjection> findLatestDailySummary(Long seniorId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT summary_date, mood, pain, medication_topic, appointment_topic, needs_attention, summary_text " +
                                "FROM chatbot_daily_summaries " +
                                "WHERE senior_id = :seniorId " +
                                "ORDER BY summary_date DESC, id DESC " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Object[] row = rows.getFirst();
        return Optional.of(new DailySummaryProjection(
                toLocalDate(row[0]),
                toStringValue(row[1]),
                toStringValue(row[2]),
                toBoolean(row[3]),
                toBoolean(row[4]),
                toBoolean(row[5]),
                toStringValue(row[6])
        ));
    }

    public List<AppointmentProjection> findAppointmentsBetween(Long seniorId, LocalDateTime from, LocalDateTime to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, specialty, appointment_at, doctor_name, notes, status, created_at, updated_at " +
                                "FROM appointments " +
                                "WHERE senior_id = :seniorId " +
                                "AND (" +
                                "appointment_at >= :fromDate OR created_at >= :fromDate OR updated_at >= :fromDate" +
                                ") AND appointment_at < :toDate " +
                                "ORDER BY updated_at DESC, appointment_at DESC, id DESC")
                .setParameter("seniorId", seniorId)
                .setParameter("fromDate", Timestamp.valueOf(from))
                .setParameter("toDate", Timestamp.valueOf(to))
                .getResultList();

        return rows.stream()
                .map(row -> new AppointmentProjection(
                        toLong(row[0]),
                        toStringValue(row[1]),
                        toLocalDateTime(row[2]),
                        toStringValue(row[3]),
                        toStringValue(row[4]),
                        toStringValue(row[5]),
                        toLocalDateTime(row[6]),
                        toLocalDateTime(row[7])
                ))
                .toList();
    }

    public Optional<AppointmentProjection> findNextAppointment(Long seniorId, LocalDateTime from) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, specialty, appointment_at, doctor_name, notes, status, created_at, updated_at " +
                                "FROM appointments " +
                                "WHERE senior_id = :seniorId " +
                                "AND status = 'scheduled' " +
                                "AND appointment_at >= :fromDate " +
                                "ORDER BY appointment_at ASC, id ASC " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .setParameter("fromDate", Timestamp.valueOf(from))
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Object[] row = rows.getFirst();
        return Optional.of(new AppointmentProjection(
                toLong(row[0]),
                toStringValue(row[1]),
                toLocalDateTime(row[2]),
                toStringValue(row[3]),
                toStringValue(row[4]),
                toStringValue(row[5]),
                toLocalDateTime(row[6]),
                toLocalDateTime(row[7])
        ));
    }

    public List<SosAlertProjection> findSosAlertsBetween(Long seniorId, LocalDateTime from, LocalDateTime to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, triggered_at, status, comment, acknowledged_at, acknowledged_by_user_id, resolved_at, resolved_by_user_id " +
                                "FROM sos_alerts " +
                                "WHERE senior_id = :seniorId " +
                                "AND triggered_at >= :fromDate " +
                                "AND triggered_at < :toDate " +
                                "ORDER BY triggered_at DESC, id DESC")
                .setParameter("seniorId", seniorId)
                .setParameter("fromDate", Timestamp.valueOf(from))
                .setParameter("toDate", Timestamp.valueOf(to))
                .getResultList();

        return rows.stream()
                .map(row -> new SosAlertProjection(
                        toLong(row[0]),
                        toLocalDateTime(row[1]),
                        toStringValue(row[2]),
                        toStringValue(row[3]),
                        toLocalDateTime(row[4]),
                        toLong(row[5]),
                        toLocalDateTime(row[6]),
                        toLong(row[7])
                ))
                .toList();
    }

    public Optional<SosAlertProjection> findLatestActiveSosAlert(Long seniorId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, triggered_at, status, comment, acknowledged_at, acknowledged_by_user_id, resolved_at, resolved_by_user_id " +
                                "FROM sos_alerts " +
                                "WHERE senior_id = :seniorId AND status IN ('triggered', 'acknowledged') " +
                                "ORDER BY triggered_at DESC, id DESC LIMIT 1")
                .setParameter("seniorId", seniorId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Object[] row = rows.getFirst();
        return Optional.of(new SosAlertProjection(
                toLong(row[0]),
                toLocalDateTime(row[1]),
                toStringValue(row[2]),
                toStringValue(row[3]),
                toLocalDateTime(row[4]),
                toLong(row[5]),
                toLocalDateTime(row[6]),
                toLong(row[7])
        ));
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

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private String toStringValue(Object value) {
        return value == null ? null : value.toString();
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

    private LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date date) {
            return date.toLocalDate();
        }
        return LocalDate.parse(value.toString());
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

    public static class SeniorOverviewProjection {
        private final Long id;
        private final String name;
        private final Integer age;
        private final String city;
        private final String medicalCondition;
        private final String bloodType;
        private final String email;

        public SeniorOverviewProjection(Long id, String name, Integer age, String city,
                                        String medicalCondition, String bloodType, String email) {
            this.id = id;
            this.name = name;
            this.age = age;
            this.city = city;
            this.medicalCondition = medicalCondition;
            this.bloodType = bloodType;
            this.email = email;
        }

        public Long getId() { return id; }
        public String getName() { return name; }
        public Integer getAge() { return age; }
        public String getCity() { return city; }
        public String getMedicalCondition() { return medicalCondition; }
        public String getBloodType() { return bloodType; }
        public String getEmail() { return email; }
    }

    public static class MedicationScheduleProjection {
        private final Long id;
        private final String name;
        private final String dosage;
        private final boolean active;
        private final LocalDateTime createdAt;
        private final LocalDateTime updatedAt;

        public MedicationScheduleProjection(Long id, String name, String dosage, boolean active,
                                            LocalDateTime createdAt, LocalDateTime updatedAt) {
            this.id = id;
            this.name = name;
            this.dosage = dosage;
            this.active = active;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }

        public Long getId() { return id; }
        public String getName() { return name; }
        public String getDosage() { return dosage; }
        public boolean isActive() { return active; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public LocalDateTime getUpdatedAt() { return updatedAt; }
    }

    public static class MedicationTakeProjection {
        private final Long medicationId;
        private final String medicationName;
        private final LocalDateTime scheduledAt;
        private final LocalDateTime takenAt;
        private final String status;

        public MedicationTakeProjection(Long medicationId, String medicationName,
                                        LocalDateTime scheduledAt, LocalDateTime takenAt, String status) {
            this.medicationId = medicationId;
            this.medicationName = medicationName;
            this.scheduledAt = scheduledAt;
            this.takenAt = takenAt;
            this.status = status;
        }

        public Long getMedicationId() { return medicationId; }
        public String getMedicationName() { return medicationName; }
        public LocalDateTime getScheduledAt() { return scheduledAt; }
        public LocalDateTime getTakenAt() { return takenAt; }
        public String getStatus() { return status; }
    }

    public static class DailyCheckinProjection {
        private final String question;
        private final String answer;
        private final LocalDateTime answeredAt;

        public DailyCheckinProjection(String question, String answer, LocalDateTime answeredAt) {
            this.question = question;
            this.answer = answer;
            this.answeredAt = answeredAt;
        }

        public String getQuestion() { return question; }
        public String getAnswer() { return answer; }
        public LocalDateTime getAnsweredAt() { return answeredAt; }
    }

    public static class DailySummaryProjection {
        private final LocalDate summaryDate;
        private final String mood;
        private final String pain;
        private final boolean medicationTopic;
        private final boolean appointmentTopic;
        private final boolean needsAttention;
        private final String summaryText;

        public DailySummaryProjection(LocalDate summaryDate, String mood, String pain,
                                      boolean medicationTopic, boolean appointmentTopic,
                                      boolean needsAttention, String summaryText) {
            this.summaryDate = summaryDate;
            this.mood = mood;
            this.pain = pain;
            this.medicationTopic = medicationTopic;
            this.appointmentTopic = appointmentTopic;
            this.needsAttention = needsAttention;
            this.summaryText = summaryText;
        }

        public LocalDate getSummaryDate() { return summaryDate; }
        public String getMood() { return mood; }
        public String getPain() { return pain; }
        public boolean isMedicationTopic() { return medicationTopic; }
        public boolean isAppointmentTopic() { return appointmentTopic; }
        public boolean isNeedsAttention() { return needsAttention; }
        public String getSummaryText() { return summaryText; }
    }

    public static class AppointmentProjection {
        private final Long id;
        private final String specialty;
        private final LocalDateTime appointmentAt;
        private final String doctorName;
        private final String notes;
        private final String status;
        private final LocalDateTime createdAt;
        private final LocalDateTime updatedAt;

        public AppointmentProjection(Long id, String specialty, LocalDateTime appointmentAt,
                                     String doctorName, String notes, String status,
                                     LocalDateTime createdAt, LocalDateTime updatedAt) {
            this.id = id;
            this.specialty = specialty;
            this.appointmentAt = appointmentAt;
            this.doctorName = doctorName;
            this.notes = notes;
            this.status = status;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }

        public Long getId() { return id; }
        public String getSpecialty() { return specialty; }
        public LocalDateTime getAppointmentAt() { return appointmentAt; }
        public String getDoctorName() { return doctorName; }
        public String getNotes() { return notes; }
        public String getStatus() { return status; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public LocalDateTime getUpdatedAt() { return updatedAt; }
    }

    public static class SosAlertProjection {
        private final Long id;
        private final LocalDateTime triggeredAt;
        private final String status;
        private final String comment;
        private final LocalDateTime acknowledgedAt;
        private final Long acknowledgedByUserId;
        private final LocalDateTime resolvedAt;
        private final Long resolvedByUserId;

        public SosAlertProjection(Long id, LocalDateTime triggeredAt, String status, String comment,
                                  LocalDateTime acknowledgedAt, Long acknowledgedByUserId,
                                  LocalDateTime resolvedAt, Long resolvedByUserId) {
            this.id = id;
            this.triggeredAt = triggeredAt;
            this.status = status;
            this.comment = comment;
            this.acknowledgedAt = acknowledgedAt;
            this.acknowledgedByUserId = acknowledgedByUserId;
            this.resolvedAt = resolvedAt;
            this.resolvedByUserId = resolvedByUserId;
        }

        public Long getId() { return id; }
        public LocalDateTime getTriggeredAt() { return triggeredAt; }
        public String getStatus() { return status; }
        public String getComment() { return comment; }
        public LocalDateTime getAcknowledgedAt() { return acknowledgedAt; }
        public Long getAcknowledgedByUserId() { return acknowledgedByUserId; }
        public LocalDateTime getResolvedAt() { return resolvedAt; }
        public Long getResolvedByUserId() { return resolvedByUserId; }
    }
}
