package com.curafamilia.auth.repository;

import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public class AccessControlRepository {
    private final EntityManager entityManager;

    public AccessControlRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Optional<UserProjection> findActiveUser(Long userId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, name, email, role, age, city, medical_condition, blood_type " +
                                "FROM users " +
                                "WHERE id = :userId AND is_active = 1 " +
                                "LIMIT 1")
                .setParameter("userId", userId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Object[] row = rows.getFirst();
        return Optional.of(new UserProjection(
                toLong(row[0]),
                toStringValue(row[1]),
                toStringValue(row[2]),
                toStringValue(row[3]),
                toInteger(row[4]),
                toStringValue(row[5]),
                toStringValue(row[6]),
                toStringValue(row[7])
        ));
    }

    public Optional<UserProjection> findActiveSenior(Long seniorId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, name, email, role, age, city, medical_condition, blood_type " +
                                "FROM users " +
                                "WHERE id = :seniorId AND role = 'senior' AND is_active = 1 " +
                                "LIMIT 1")
                .setParameter("seniorId", seniorId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Object[] row = rows.getFirst();
        return Optional.of(new UserProjection(
                toLong(row[0]),
                toStringValue(row[1]),
                toStringValue(row[2]),
                toStringValue(row[3]),
                toInteger(row[4]),
                toStringValue(row[5]),
                toStringValue(row[6]),
                toStringValue(row[7])
        ));
    }

    public boolean isFamilyLinkedToSenior(Long familyUserId, Long seniorId) {
        Object count = entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM family_senior_links " +
                                "WHERE family_user_id = :familyUserId " +
                                "AND senior_user_id = :seniorId " +
                                "AND is_active = 1")
                .setParameter("familyUserId", familyUserId)
                .setParameter("seniorId", seniorId)
                .getSingleResult();
        return toLong(count) > 0;
    }

    @SuppressWarnings("unchecked")
    public List<LinkedSeniorProjection> findLinkedSeniorsForFamily(Long familyUserId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT u.id, u.name, u.age, u.city, u.medical_condition, u.blood_type, " +
                                "COALESCE(fsl.linked_at, fsl.created_at) AS linked_at " +
                                "FROM family_senior_links fsl " +
                                "JOIN users u ON u.id = fsl.senior_user_id " +
                                "WHERE fsl.family_user_id = :familyUserId " +
                                "AND fsl.is_active = 1 " +
                                "AND u.is_active = 1 " +
                                "AND u.role = 'senior' " +
                                "ORDER BY COALESCE(fsl.linked_at, fsl.created_at) DESC, u.id DESC")
                .setParameter("familyUserId", familyUserId)
                .getResultList();

        return rows.stream()
                .map(row -> new LinkedSeniorProjection(
                        toLong(row[0]),
                        toStringValue(row[1]),
                        toInteger(row[2]),
                        toStringValue(row[3]),
                        toStringValue(row[4]),
                        toStringValue(row[5]),
                        toLocalDateTime(row[6])
                ))
                .toList();
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

    public static class UserProjection {
        private final Long id;
        private final String name;
        private final String email;
        private final String role;
        private final Integer age;
        private final String city;
        private final String medicalCondition;
        private final String bloodType;

        public UserProjection(Long id, String name, String email, String role,
                              Integer age, String city, String medicalCondition, String bloodType) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.role = role;
            this.age = age;
            this.city = city;
            this.medicalCondition = medicalCondition;
            this.bloodType = bloodType;
        }

        public Long getId() {
            return id;
        }

        public String getName() {
            return name;
        }

        public String getEmail() {
            return email;
        }

        public String getRole() {
            return role;
        }

        public Integer getAge() {
            return age;
        }

        public String getCity() {
            return city;
        }

        public String getMedicalCondition() {
            return medicalCondition;
        }

        public String getBloodType() {
            return bloodType;
        }
    }

    public static class LinkedSeniorProjection {
        private final Long seniorId;
        private final String name;
        private final Integer age;
        private final String city;
        private final String medicalCondition;
        private final String bloodType;
        private final LocalDateTime linkedAt;

        public LinkedSeniorProjection(Long seniorId, String name, Integer age, String city,
                                      String medicalCondition, String bloodType, LocalDateTime linkedAt) {
            this.seniorId = seniorId;
            this.name = name;
            this.age = age;
            this.city = city;
            this.medicalCondition = medicalCondition;
            this.bloodType = bloodType;
            this.linkedAt = linkedAt;
        }

        public Long getSeniorId() {
            return seniorId;
        }

        public String getName() {
            return name;
        }

        public Integer getAge() {
            return age;
        }

        public String getCity() {
            return city;
        }

        public String getMedicalCondition() {
            return medicalCondition;
        }

        public String getBloodType() {
            return bloodType;
        }

        public LocalDateTime getLinkedAt() {
            return linkedAt;
        }
    }
}
