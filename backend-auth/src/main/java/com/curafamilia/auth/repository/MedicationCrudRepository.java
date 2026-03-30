package com.curafamilia.auth.repository;

import jakarta.persistence.EntityManager;
import java.sql.Time;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public class MedicationCrudRepository {
    private final EntityManager entityManager;

    public MedicationCrudRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Long insertMedication(Long seniorId, String name, String dosage, LocalTime scheduledTime,
                                 String frequency, String period, String instruction, boolean active) {
        entityManager.createNativeQuery(
                        "INSERT INTO medications " +
                                "(senior_id, name, dosage, scheduled_time, frequency, period, instruction, is_active) " +
                                "VALUES (:seniorId, :name, :dosage, :scheduledTime, :frequency, :period, :instruction, :isActive)")
                .setParameter("seniorId", seniorId)
                .setParameter("name", name)
                .setParameter("dosage", dosage)
                .setParameter("scheduledTime", Time.valueOf(scheduledTime))
                .setParameter("frequency", frequency)
                .setParameter("period", period)
                .setParameter("instruction", instruction)
                .setParameter("isActive", active ? 1 : 0)
                .executeUpdate();

        Object id = entityManager.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult();
        return toLong(id);
    }

    public void updateMedication(Long medicationId, String name, String dosage, LocalTime scheduledTime,
                                 String frequency, String period, String instruction, boolean active) {
        entityManager.createNativeQuery(
                        "UPDATE medications SET " +
                                "name = :name, dosage = :dosage, scheduled_time = :scheduledTime, " +
                                "frequency = :frequency, period = :period, instruction = :instruction, is_active = :isActive " +
                                "WHERE id = :medicationId")
                .setParameter("name", name)
                .setParameter("dosage", dosage)
                .setParameter("scheduledTime", Time.valueOf(scheduledTime))
                .setParameter("frequency", frequency)
                .setParameter("period", period)
                .setParameter("instruction", instruction)
                .setParameter("isActive", active ? 1 : 0)
                .setParameter("medicationId", medicationId)
                .executeUpdate();
    }

    public void softDeleteMedication(Long medicationId) {
        entityManager.createNativeQuery(
                        "UPDATE medications SET is_active = 0 WHERE id = :medicationId")
                .setParameter("medicationId", medicationId)
                .executeUpdate();
    }

    public Optional<MedicationProjection> findMedicationById(Long medicationId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, senior_id, name, dosage, scheduled_time, frequency, period, instruction, is_active " +
                                "FROM medications " +
                                "WHERE id = :medicationId " +
                                "LIMIT 1")
                .setParameter("medicationId", medicationId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toProjection(rows.getFirst()));
    }

    private MedicationProjection toProjection(Object[] row) {
        return new MedicationProjection(
                toLong(row[0]),
                toLong(row[1]),
                toStringValue(row[2]),
                toStringValue(row[3]),
                toLocalTime(row[4]),
                toStringValue(row[5]),
                toStringValue(row[6]),
                toStringValue(row[7]),
                toBoolean(row[8])
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

    public static class MedicationProjection {
        private final Long id;
        private final Long seniorId;
        private final String name;
        private final String dosage;
        private final LocalTime scheduledTime;
        private final String frequency;
        private final String period;
        private final String instruction;
        private final boolean active;

        public MedicationProjection(Long id, Long seniorId, String name, String dosage, LocalTime scheduledTime,
                                    String frequency, String period, String instruction, boolean active) {
            this.id = id;
            this.seniorId = seniorId;
            this.name = name;
            this.dosage = dosage;
            this.scheduledTime = scheduledTime;
            this.frequency = frequency;
            this.period = period;
            this.instruction = instruction;
            this.active = active;
        }

        public Long getId() {
            return id;
        }

        public Long getSeniorId() {
            return seniorId;
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

        public boolean isActive() {
            return active;
        }
    }
}
