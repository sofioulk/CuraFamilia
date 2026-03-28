package com.curafamilia.auth.repository;

import jakarta.persistence.EntityManager;
import java.math.BigInteger;
import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public class SeniorAssistantRepository {
    private final EntityManager entityManager;

    public SeniorAssistantRepository(EntityManager entityManager) {
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

    public Long upsertOpenSessionAndGetId(Long seniorId, LocalDate sessionDate, LocalDateTime startedAt) {
        entityManager.createNativeQuery(
                        "INSERT INTO chatbot_sessions (senior_id, session_date, status, started_at, ended_at) " +
                                "VALUES (:seniorId, :sessionDate, 'open', :startedAt, NULL) " +
                                "ON DUPLICATE KEY UPDATE " +
                                "id = LAST_INSERT_ID(id), " +
                                "status = 'open', " +
                                "ended_at = NULL")
                .setParameter("seniorId", seniorId)
                .setParameter("sessionDate", Date.valueOf(sessionDate))
                .setParameter("startedAt", Timestamp.valueOf(startedAt))
                .executeUpdate();

        Object id = entityManager.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult();
        return toLong(id);
    }

    public Optional<SessionProjection> findSessionByDate(Long seniorId, LocalDate sessionDate) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, senior_id, session_date, status, started_at, ended_at " +
                                "FROM chatbot_sessions " +
                                "WHERE senior_id = :seniorId AND session_date = :sessionDate " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .setParameter("sessionDate", Date.valueOf(sessionDate))
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = rows.getFirst();
        return Optional.of(new SessionProjection(
                toLong(row[0]),
                toLong(row[1]),
                toLocalDate(row[2]),
                toStringValue(row[3]),
                toLocalDateTime(row[4]),
                toLocalDateTime(row[5])
        ));
    }

    public Long insertMessageAndGetId(Long sessionId, String sender, String message, String intent, LocalDateTime createdAt) {
        entityManager.createNativeQuery(
                        "INSERT INTO chatbot_messages (session_id, sender, message, intent, created_at) " +
                                "VALUES (:sessionId, :sender, :message, :intent, :createdAt)")
                .setParameter("sessionId", sessionId)
                .setParameter("sender", sender)
                .setParameter("message", message)
                .setParameter("intent", intent)
                .setParameter("createdAt", Timestamp.valueOf(createdAt))
                .executeUpdate();

        Object id = entityManager.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult();
        return toLong(id);
    }

    public Optional<MessageProjection> findMessageById(Long messageId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, session_id, sender, message, intent, created_at " +
                                "FROM chatbot_messages " +
                                "WHERE id = :messageId " +
                                "LIMIT 1")
                .setParameter("messageId", messageId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = rows.getFirst();
        return Optional.of(new MessageProjection(
                toLong(row[0]),
                toLong(row[1]),
                toStringValue(row[2]),
                toStringValue(row[3]),
                toStringValue(row[4]),
                toLocalDateTime(row[5])
        ));
    }

    public List<MessageProjection> findMessagesBySession(Long sessionId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, session_id, sender, message, intent, created_at " +
                                "FROM chatbot_messages " +
                                "WHERE session_id = :sessionId " +
                                "ORDER BY created_at ASC, id ASC")
                .setParameter("sessionId", sessionId)
                .getResultList();

        return rows.stream()
                .map(row -> new MessageProjection(
                        toLong(row[0]),
                        toLong(row[1]),
                        toStringValue(row[2]),
                        toStringValue(row[3]),
                        toStringValue(row[4]),
                        toLocalDateTime(row[5])
                ))
                .toList();
    }

    public Optional<MedicationHintProjection> findNextMedication(Long seniorId, LocalTime currentTime) {
        List<Object[]> upcomingRows = entityManager.createNativeQuery(
                        "SELECT id, name, dosage, scheduled_time, period " +
                                "FROM medications " +
                                "WHERE senior_id = :seniorId AND is_active = 1 " +
                                "AND scheduled_time >= :currentTime " +
                                "ORDER BY scheduled_time ASC, id ASC " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .setParameter("currentTime", Time.valueOf(currentTime))
                .getResultList();

        if (!upcomingRows.isEmpty()) {
            Object[] row = upcomingRows.getFirst();
            return Optional.of(new MedicationHintProjection(
                    toLong(row[0]),
                    toStringValue(row[1]),
                    toStringValue(row[2]),
                    toLocalTime(row[3]),
                    toStringValue(row[4])
            ));
        }

        List<Object[]> earliestRows = entityManager.createNativeQuery(
                        "SELECT id, name, dosage, scheduled_time, period " +
                                "FROM medications " +
                                "WHERE senior_id = :seniorId AND is_active = 1 " +
                                "ORDER BY scheduled_time ASC, id ASC " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .getResultList();

        if (earliestRows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = earliestRows.getFirst();
        return Optional.of(new MedicationHintProjection(
                toLong(row[0]),
                toStringValue(row[1]),
                toStringValue(row[2]),
                toLocalTime(row[3]),
                toStringValue(row[4])
        ));
    }

    public Optional<AppointmentHintProjection> findNextAppointment(Long seniorId, LocalDateTime now) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, specialty, appointment_at, doctor_name " +
                                "FROM appointments " +
                                "WHERE senior_id = :seniorId " +
                                "AND status = 'scheduled' " +
                                "AND appointment_at >= :fromDateTime " +
                                "ORDER BY appointment_at ASC, id ASC " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .setParameter("fromDateTime", Timestamp.valueOf(now))
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = rows.getFirst();
        return Optional.of(new AppointmentHintProjection(
                toLong(row[0]),
                toStringValue(row[1]),
                toLocalDateTime(row[2]),
                toStringValue(row[3])
        ));
    }

    public Optional<DailySummaryProjection> findDailySummary(Long seniorId, LocalDate summaryDate) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT mood, pain, medication_topic, appointment_topic, needs_attention, summary_text " +
                                "FROM chatbot_daily_summaries " +
                                "WHERE senior_id = :seniorId AND summary_date = :summaryDate " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .setParameter("summaryDate", Date.valueOf(summaryDate))
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = rows.getFirst();
        return Optional.of(new DailySummaryProjection(
                toStringValue(row[0]),
                toStringValue(row[1]),
                toBoolean(row[2]),
                toBoolean(row[3]),
                toBoolean(row[4]),
                toStringValue(row[5])
        ));
    }

    public void upsertDailySummary(Long seniorId, LocalDate summaryDate, DailySummaryProjection summary) {
        entityManager.createNativeQuery(
                        "INSERT INTO chatbot_daily_summaries " +
                                "(senior_id, summary_date, mood, pain, medication_topic, appointment_topic, needs_attention, summary_text) " +
                                "VALUES (:seniorId, :summaryDate, :mood, :pain, :medicationTopic, :appointmentTopic, :needsAttention, :summaryText) " +
                                "ON DUPLICATE KEY UPDATE " +
                                "mood = VALUES(mood), " +
                                "pain = VALUES(pain), " +
                                "medication_topic = VALUES(medication_topic), " +
                                "appointment_topic = VALUES(appointment_topic), " +
                                "needs_attention = VALUES(needs_attention), " +
                                "summary_text = VALUES(summary_text)")
                .setParameter("seniorId", seniorId)
                .setParameter("summaryDate", Date.valueOf(summaryDate))
                .setParameter("mood", summary.mood())
                .setParameter("pain", summary.pain())
                .setParameter("medicationTopic", summary.medicationTopic() ? 1 : 0)
                .setParameter("appointmentTopic", summary.appointmentTopic() ? 1 : 0)
                .setParameter("needsAttention", summary.needsAttention() ? 1 : 0)
                .setParameter("summaryText", summary.summaryText())
                .executeUpdate();
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof BigInteger bigInteger) {
            return bigInteger.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private String toStringValue(Object value) {
        return value == null ? null : value.toString();
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

    public static class SessionProjection {
        private final Long id;
        private final Long seniorId;
        private final LocalDate sessionDate;
        private final String status;
        private final LocalDateTime startedAt;
        private final LocalDateTime endedAt;

        public SessionProjection(Long id, Long seniorId, LocalDate sessionDate, String status,
                                 LocalDateTime startedAt, LocalDateTime endedAt) {
            this.id = id;
            this.seniorId = seniorId;
            this.sessionDate = sessionDate;
            this.status = status;
            this.startedAt = startedAt;
            this.endedAt = endedAt;
        }

        public Long getId() {
            return id;
        }

        public Long getSeniorId() {
            return seniorId;
        }

        public LocalDate getSessionDate() {
            return sessionDate;
        }

        public String getStatus() {
            return status;
        }

        public LocalDateTime getStartedAt() {
            return startedAt;
        }

        public LocalDateTime getEndedAt() {
            return endedAt;
        }
    }

    public static class MessageProjection {
        private final Long id;
        private final Long sessionId;
        private final String sender;
        private final String message;
        private final String intent;
        private final LocalDateTime createdAt;

        public MessageProjection(Long id, Long sessionId, String sender, String message,
                                 String intent, LocalDateTime createdAt) {
            this.id = id;
            this.sessionId = sessionId;
            this.sender = sender;
            this.message = message;
            this.intent = intent;
            this.createdAt = createdAt;
        }

        public Long getId() {
            return id;
        }

        public Long getSessionId() {
            return sessionId;
        }

        public String getSender() {
            return sender;
        }

        public String getMessage() {
            return message;
        }

        public String getIntent() {
            return intent;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }
    }

    public static class MedicationHintProjection {
        private final Long id;
        private final String name;
        private final String dosage;
        private final LocalTime scheduledTime;
        private final String period;

        public MedicationHintProjection(Long id, String name, String dosage, LocalTime scheduledTime, String period) {
            this.id = id;
            this.name = name;
            this.dosage = dosage;
            this.scheduledTime = scheduledTime;
            this.period = period;
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

        public LocalTime getScheduledTime() {
            return scheduledTime;
        }

        public String getPeriod() {
            return period;
        }
    }

    public static class AppointmentHintProjection {
        private final Long id;
        private final String specialty;
        private final LocalDateTime appointmentAt;
        private final String doctorName;

        public AppointmentHintProjection(Long id, String specialty, LocalDateTime appointmentAt, String doctorName) {
            this.id = id;
            this.specialty = specialty;
            this.appointmentAt = appointmentAt;
            this.doctorName = doctorName;
        }

        public Long getId() {
            return id;
        }

        public String getSpecialty() {
            return specialty;
        }

        public LocalDateTime getAppointmentAt() {
            return appointmentAt;
        }

        public String getDoctorName() {
            return doctorName;
        }
    }

    public record DailySummaryProjection(
            String mood,
            String pain,
            boolean medicationTopic,
            boolean appointmentTopic,
            boolean needsAttention,
            String summaryText
    ) {
    }
}
