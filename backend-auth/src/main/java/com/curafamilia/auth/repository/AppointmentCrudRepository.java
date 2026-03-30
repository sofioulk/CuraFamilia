package com.curafamilia.auth.repository;

import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public class AppointmentCrudRepository {
    private final EntityManager entityManager;

    public AppointmentCrudRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Long insertAppointment(Long seniorId, String specialty, LocalDateTime appointmentAt,
                                  String doctorName, String notes, String status) {
        entityManager.createNativeQuery(
                        "INSERT INTO appointments " +
                                "(senior_id, specialty, appointment_at, doctor_name, notes, status) " +
                                "VALUES (:seniorId, :specialty, :appointmentAt, :doctorName, :notes, :status)")
                .setParameter("seniorId", seniorId)
                .setParameter("specialty", specialty)
                .setParameter("appointmentAt", Timestamp.valueOf(appointmentAt))
                .setParameter("doctorName", doctorName)
                .setParameter("notes", notes)
                .setParameter("status", status)
                .executeUpdate();

        Object id = entityManager.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult();
        return toLong(id);
    }

    public void updateAppointment(Long appointmentId, String specialty, LocalDateTime appointmentAt,
                                  String doctorName, String notes, String status) {
        entityManager.createNativeQuery(
                        "UPDATE appointments SET " +
                                "specialty = :specialty, appointment_at = :appointmentAt, doctor_name = :doctorName, " +
                                "notes = :notes, status = :status " +
                                "WHERE id = :appointmentId")
                .setParameter("specialty", specialty)
                .setParameter("appointmentAt", Timestamp.valueOf(appointmentAt))
                .setParameter("doctorName", doctorName)
                .setParameter("notes", notes)
                .setParameter("status", status)
                .setParameter("appointmentId", appointmentId)
                .executeUpdate();
    }

    public void deleteAppointment(Long appointmentId) {
        entityManager.createNativeQuery(
                        "DELETE FROM appointments WHERE id = :appointmentId")
                .setParameter("appointmentId", appointmentId)
                .executeUpdate();
    }

    public Optional<AppointmentProjection> findById(Long appointmentId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, senior_id, specialty, appointment_at, doctor_name, notes, status " +
                                "FROM appointments " +
                                "WHERE id = :appointmentId " +
                                "LIMIT 1")
                .setParameter("appointmentId", appointmentId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toProjection(rows.getFirst()));
    }

    private AppointmentProjection toProjection(Object[] row) {
        return new AppointmentProjection(
                toLong(row[0]),
                toLong(row[1]),
                toStringValue(row[2]),
                toLocalDateTime(row[3]),
                toStringValue(row[4]),
                toStringValue(row[5]),
                toStringValue(row[6])
        );
    }

    private Long toLong(Object value) {
        if (value == null) {
            return 0L;
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

    public static class AppointmentProjection {
        private final Long id;
        private final Long seniorId;
        private final String specialty;
        private final LocalDateTime appointmentAt;
        private final String doctorName;
        private final String notes;
        private final String status;

        public AppointmentProjection(Long id, Long seniorId, String specialty, LocalDateTime appointmentAt,
                                     String doctorName, String notes, String status) {
            this.id = id;
            this.seniorId = seniorId;
            this.specialty = specialty;
            this.appointmentAt = appointmentAt;
            this.doctorName = doctorName;
            this.notes = notes;
            this.status = status;
        }

        public Long getId() {
            return id;
        }

        public Long getSeniorId() {
            return seniorId;
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
}
