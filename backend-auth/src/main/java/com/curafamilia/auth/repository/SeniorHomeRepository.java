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

public class SeniorHomeRepository {
    private final EntityManager entityManager;

    public SeniorHomeRepository(EntityManager entityManager) {
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

    public List<MedicationProjection> findActiveMedications(Long seniorId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, name, dosage, scheduled_time, frequency, period, instruction " +
                                "FROM medications " +
                                "WHERE senior_id = :seniorId AND is_active = 1 " +
                                "ORDER BY scheduled_time ASC")
                .setParameter("seniorId", seniorId)
                .getResultList();

        return rows.stream()
                .map(row -> new MedicationProjection(
                        toLong(row[0]),
                        toStringValue(row[1]),
                        toStringValue(row[2]),
                        toLocalTime(row[3]),
                        toStringValue(row[4]),
                        toStringValue(row[5]),
                        toStringValue(row[6])
                ))
                .toList();
    }

    public Optional<MedicationProjection> findMedicationForSenior(Long seniorId, Long medicationId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, name, dosage, scheduled_time, frequency, period, instruction " +
                                "FROM medications " +
                                "WHERE id = :medicationId AND senior_id = :seniorId AND is_active = 1 " +
                                "LIMIT 1")
                .setParameter("medicationId", medicationId)
                .setParameter("seniorId", seniorId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = rows.getFirst();
        return Optional.of(new MedicationProjection(
                toLong(row[0]),
                toStringValue(row[1]),
                toStringValue(row[2]),
                toLocalTime(row[3]),
                toStringValue(row[4]),
                toStringValue(row[5]),
                toStringValue(row[6])
        ));
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

    public Optional<MedicationTakeProjection> findMedicationTake(Long medicationId, LocalDateTime scheduledAt) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT medication_id, scheduled_at, taken_at, status " +
                                "FROM medication_takes " +
                                "WHERE medication_id = :medicationId AND scheduled_at = :scheduledAt " +
                                "LIMIT 1")
                .setParameter("medicationId", medicationId)
                .setParameter("scheduledAt", Timestamp.valueOf(scheduledAt))
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = rows.getFirst();
        return Optional.of(new MedicationTakeProjection(
                toLong(row[0]),
                toLocalDateTime(row[1]),
                toLocalDateTime(row[2]),
                toStringValue(row[3])
        ));
    }

    public void upsertMedicationTake(Long medicationId, Long seniorId, LocalDateTime scheduledAt, LocalDateTime takenAt) {
        entityManager.createNativeQuery(
                        "INSERT INTO medication_takes (medication_id, senior_id, scheduled_at, taken_at, status) " +
                                "VALUES (:medicationId, :seniorId, :scheduledAt, :takenAt, 'taken') " +
                                "ON DUPLICATE KEY UPDATE " +
                                "taken_at = VALUES(taken_at), " +
                                "status = 'taken'")
                .setParameter("medicationId", medicationId)
                .setParameter("seniorId", seniorId)
                .setParameter("scheduledAt", Timestamp.valueOf(scheduledAt))
                .setParameter("takenAt", Timestamp.valueOf(takenAt))
                .executeUpdate();
    }

    public Optional<AppointmentProjection> findNextScheduledAppointment(Long seniorId, LocalDateTime fromDateTime) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, specialty, appointment_at, doctor_name, notes, status " +
                                "FROM appointments " +
                                "WHERE senior_id = :seniorId " +
                                "AND status = 'scheduled' " +
                                "AND appointment_at >= :fromDateTime " +
                                "ORDER BY appointment_at ASC " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .setParameter("fromDateTime", Timestamp.valueOf(fromDateTime))
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
                toStringValue(row[5])
        ));
    }

    public Optional<DailyCheckinProjection> findLatestCheckinForDate(Long seniorId, LocalDate targetDate) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT question, answer, answered_at " +
                                "FROM daily_checkins " +
                                "WHERE senior_id = :seniorId AND DATE(answered_at) = :targetDate " +
                                "ORDER BY answered_at DESC " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .setParameter("targetDate", Date.valueOf(targetDate))
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = rows.getFirst();
        return Optional.of(new DailyCheckinProjection(
                toStringValue(row[0]),
                toStringValue(row[1]),
                toLocalDateTime(row[2])
        ));
    }

    public Optional<DailyCheckinProjection> findLatestCheckinForQuestionAndDate(Long seniorId, String question, LocalDate targetDate) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT question, answer, answered_at " +
                                "FROM daily_checkins " +
                                "WHERE senior_id = :seniorId " +
                                "AND question = :question " +
                                "AND DATE(answered_at) = :targetDate " +
                                "ORDER BY answered_at DESC " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .setParameter("question", question)
                .setParameter("targetDate", Date.valueOf(targetDate))
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }

        Object[] row = rows.getFirst();
        return Optional.of(new DailyCheckinProjection(
                toStringValue(row[0]),
                toStringValue(row[1]),
                toLocalDateTime(row[2])
        ));
    }

    public void insertDailyCheckin(Long seniorId, String question, String answer, LocalDateTime answeredAt) {
        entityManager.createNativeQuery(
                        "INSERT INTO daily_checkins (senior_id, question, answer, answered_at) " +
                                "VALUES (:seniorId, :question, :answer, :answeredAt)")
                .setParameter("seniorId", seniorId)
                .setParameter("question", question)
                .setParameter("answer", answer)
                .setParameter("answeredAt", Timestamp.valueOf(answeredAt))
                .executeUpdate();
    }

    public void insertSosAlert(Long seniorId, LocalDateTime triggeredAt, String comment) {
        Query query = entityManager.createNativeQuery(
                "INSERT INTO sos_alerts (senior_id, triggered_at, status, comment) " +
                        "VALUES (:seniorId, :triggeredAt, 'triggered', :comment)");
        query.setParameter("seniorId", seniorId);
        query.setParameter("triggeredAt", Timestamp.valueOf(triggeredAt));
        query.setParameter("comment", comment);
        query.executeUpdate();
    }

    public Optional<SosAlertProjection> findLatestSosAlert(Long seniorId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, triggered_at, status, comment " +
                                "FROM sos_alerts " +
                                "WHERE senior_id = :seniorId " +
                                "ORDER BY triggered_at DESC, id DESC " +
                                "LIMIT 1")
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
                toStringValue(row[3])
        ));
    }

    public Optional<SosAlertProjection> findLatestActiveSosAlert(Long seniorId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, triggered_at, status, comment " +
                                "FROM sos_alerts " +
                                "WHERE senior_id = :seniorId " +
                                "AND status IN ('triggered', 'acknowledged') " +
                                "ORDER BY triggered_at DESC, id DESC " +
                                "LIMIT 1")
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
                toStringValue(row[3])
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

    private String toStringValue(Object value) {
        return value == null ? null : value.toString();
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
        private final LocalTime scheduledTime;
        private final String frequency;
        private final String period;
        private final String instruction;

        public MedicationProjection(Long id, String name, String dosage, LocalTime scheduledTime, String frequency, String period, String instruction) {
            this.id = id;
            this.name = name;
            this.dosage = dosage;
            this.scheduledTime = scheduledTime;
            this.frequency = frequency;
            this.period = period;
            this.instruction = instruction;
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

        public String getFrequency() {
            return frequency;
        }

        public String getPeriod() {
            return period;
        }

        public String getInstruction() {
            return instruction;
        }
    }

    public static class MedicationTakeProjection {
        private final Long medicationId;
        private final LocalDateTime scheduledAt;
        private final LocalDateTime takenAt;
        private final String status;

        public MedicationTakeProjection(Long medicationId, LocalDateTime scheduledAt, LocalDateTime takenAt, String status) {
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

    public static class AppointmentProjection {
        private final Long id;
        private final String specialty;
        private final LocalDateTime appointmentAt;
        private final String doctorName;
        private final String notes;
        private final String status;

        public AppointmentProjection(Long id, String specialty, LocalDateTime appointmentAt, String doctorName, String notes, String status) {
            this.id = id;
            this.specialty = specialty;
            this.appointmentAt = appointmentAt;
            this.doctorName = doctorName;
            this.notes = notes;
            this.status = status;
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

        public String getNotes() {
            return notes;
        }

        public String getStatus() {
            return status;
        }
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

        public String getQuestion() {
            return question;
        }

        public String getAnswer() {
            return answer;
        }

        public LocalDateTime getAnsweredAt() {
            return answeredAt;
        }
    }

    public static class SosAlertProjection {
        private final Long id;
        private final LocalDateTime triggeredAt;
        private final String status;
        private final String comment;

        public SosAlertProjection(Long id, LocalDateTime triggeredAt, String status, String comment) {
            this.id = id;
            this.triggeredAt = triggeredAt;
            this.status = status;
            this.comment = comment;
        }

        public Long getId() {
            return id;
        }

        public LocalDateTime getTriggeredAt() {
            return triggeredAt;
        }

        public String getStatus() {
            return status;
        }

        public String getComment() {
            return comment;
        }
    }
}
