package com.curafamilia.auth.repository;

import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public class LinkRepository {
    private final EntityManager entityManager;

    public LinkRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public void expireInvitationsBefore(LocalDateTime now) {
        entityManager.createNativeQuery(
                        "UPDATE link_invitations " +
                                "SET status = 'expired' " +
                                "WHERE status = 'active' AND expires_at < :now")
                .setParameter("now", Timestamp.valueOf(now))
                .executeUpdate();
    }

    public long insertInvitation(String code, Long seniorUserId, Long createdByUserId, LocalDateTime expiresAt) {
        entityManager.createNativeQuery(
                        "INSERT INTO link_invitations " +
                                "(code, senior_user_id, created_by_user_id, expires_at, status) " +
                                "VALUES (:code, :seniorUserId, :createdByUserId, :expiresAt, 'active')")
                .setParameter("code", code)
                .setParameter("seniorUserId", seniorUserId)
                .setParameter("createdByUserId", createdByUserId)
                .setParameter("expiresAt", Timestamp.valueOf(expiresAt))
                .executeUpdate();

        Object id = entityManager.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult();
        return toLong(id);
    }

    public Optional<InvitationProjection> findLatestByCode(String code) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, code, senior_user_id, created_by_user_id, expires_at, used_at, used_by_family_user_id, status " +
                                "FROM link_invitations " +
                                "WHERE code = :code " +
                                "ORDER BY id DESC " +
                                "LIMIT 1")
                .setParameter("code", code)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toInvitation(rows.getFirst()));
    }

    public Optional<InvitationProjection> findActiveByCode(String code, LocalDateTime now) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, code, senior_user_id, created_by_user_id, expires_at, used_at, used_by_family_user_id, status " +
                                "FROM link_invitations " +
                                "WHERE code = :code " +
                                "AND status = 'active' " +
                                "AND expires_at >= :now " +
                                "ORDER BY id DESC " +
                                "LIMIT 1")
                .setParameter("code", code)
                .setParameter("now", Timestamp.valueOf(now))
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toInvitation(rows.getFirst()));
    }

    public void markInvitationAsUsed(Long invitationId, Long familyUserId, LocalDateTime usedAt) {
        entityManager.createNativeQuery(
                        "UPDATE link_invitations " +
                                "SET status = 'used', used_at = :usedAt, used_by_family_user_id = :familyUserId " +
                                "WHERE id = :invitationId")
                .setParameter("usedAt", Timestamp.valueOf(usedAt))
                .setParameter("familyUserId", familyUserId)
                .setParameter("invitationId", invitationId)
                .executeUpdate();
    }

    public void upsertFamilySeniorLink(Long familyUserId, Long seniorUserId, String linkRole, LocalDateTime linkedAt) {
        entityManager.createNativeQuery(
                        "INSERT INTO family_senior_links " +
                                "(family_user_id, senior_user_id, link_role, linked_at, is_active) " +
                                "VALUES (:familyUserId, :seniorUserId, :linkRole, :linkedAt, 1) " +
                                "ON DUPLICATE KEY UPDATE " +
                                "link_role = VALUES(link_role), " +
                                "linked_at = VALUES(linked_at), " +
                                "is_active = 1")
                .setParameter("familyUserId", familyUserId)
                .setParameter("seniorUserId", seniorUserId)
                .setParameter("linkRole", linkRole)
                .setParameter("linkedAt", Timestamp.valueOf(linkedAt))
                .executeUpdate();
    }

    public boolean deactivateFamilySeniorLink(Long familyUserId, Long seniorUserId, LocalDateTime unlinkedAt) {
        int updated = entityManager.createNativeQuery(
                        "UPDATE family_senior_links " +
                                "SET is_active = 0, unlinked_at = :unlinkedAt " +
                                "WHERE family_user_id = :familyUserId " +
                                "AND senior_user_id = :seniorUserId " +
                                "AND is_active = 1")
                .setParameter("unlinkedAt", Timestamp.valueOf(unlinkedAt))
                .setParameter("familyUserId", familyUserId)
                .setParameter("seniorUserId", seniorUserId)
                .executeUpdate();
        return updated > 0;
    }

    private InvitationProjection toInvitation(Object[] row) {
        return new InvitationProjection(
                toLong(row[0]),
                toStringValue(row[1]),
                toLong(row[2]),
                toLong(row[3]),
                toLocalDateTime(row[4]),
                toLocalDateTime(row[5]),
                toLongNullable(row[6]),
                toStringValue(row[7])
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

    private Long toLongNullable(Object value) {
        if (value == null) {
            return null;
        }
        return toLong(value);
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

    public static class InvitationProjection {
        private final Long id;
        private final String code;
        private final Long seniorUserId;
        private final Long createdByUserId;
        private final LocalDateTime expiresAt;
        private final LocalDateTime usedAt;
        private final Long usedByFamilyUserId;
        private final String status;

        public InvitationProjection(Long id, String code, Long seniorUserId, Long createdByUserId,
                                    LocalDateTime expiresAt, LocalDateTime usedAt,
                                    Long usedByFamilyUserId, String status) {
            this.id = id;
            this.code = code;
            this.seniorUserId = seniorUserId;
            this.createdByUserId = createdByUserId;
            this.expiresAt = expiresAt;
            this.usedAt = usedAt;
            this.usedByFamilyUserId = usedByFamilyUserId;
            this.status = status;
        }

        public Long getId() {
            return id;
        }

        public String getCode() {
            return code;
        }

        public Long getSeniorUserId() {
            return seniorUserId;
        }

        public Long getCreatedByUserId() {
            return createdByUserId;
        }

        public LocalDateTime getExpiresAt() {
            return expiresAt;
        }

        public LocalDateTime getUsedAt() {
            return usedAt;
        }

        public Long getUsedByFamilyUserId() {
            return usedByFamilyUserId;
        }

        public String getStatus() {
            return status;
        }
    }
}
