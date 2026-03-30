package com.curafamilia.auth.repository;

import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public class SosManagementRepository {
    private final EntityManager entityManager;

    public SosManagementRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Optional<SosAlertProjection> findById(Long alertId) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, senior_id, triggered_at, status, comment, " +
                                "acknowledged_at, acknowledged_by_user_id, resolved_at, resolved_by_user_id " +
                                "FROM sos_alerts " +
                                "WHERE id = :alertId " +
                                "LIMIT 1")
                .setParameter("alertId", alertId)
                .getResultList();

        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toProjection(rows.getFirst()));
    }

    public List<SosAlertProjection> findHistoryBySenior(Long seniorId, int limit) {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, senior_id, triggered_at, status, comment, " +
                                "acknowledged_at, acknowledged_by_user_id, resolved_at, resolved_by_user_id " +
                                "FROM sos_alerts " +
                                "WHERE senior_id = :seniorId " +
                                "ORDER BY triggered_at DESC, id DESC " +
                                "LIMIT :limit")
                .setParameter("seniorId", seniorId)
                .setParameter("limit", limit)
                .getResultList();

        return rows.stream().map(this::toProjection).toList();
    }

    public boolean acknowledge(Long alertId, Long userId, LocalDateTime acknowledgedAt) {
        int updated = entityManager.createNativeQuery(
                        "UPDATE sos_alerts " +
                                "SET status = 'acknowledged', acknowledged_at = :acknowledgedAt, acknowledged_by_user_id = :userId " +
                                "WHERE id = :alertId AND status = 'triggered'")
                .setParameter("acknowledgedAt", Timestamp.valueOf(acknowledgedAt))
                .setParameter("userId", userId)
                .setParameter("alertId", alertId)
                .executeUpdate();
        return updated > 0;
    }

    public boolean resolve(Long alertId, Long userId, LocalDateTime resolvedAt) {
        int updated = entityManager.createNativeQuery(
                        "UPDATE sos_alerts " +
                                "SET status = 'resolved', resolved_at = :resolvedAt, resolved_by_user_id = :userId " +
                                "WHERE id = :alertId AND status IN ('triggered', 'acknowledged')")
                .setParameter("resolvedAt", Timestamp.valueOf(resolvedAt))
                .setParameter("userId", userId)
                .setParameter("alertId", alertId)
                .executeUpdate();
        return updated > 0;
    }

    private SosAlertProjection toProjection(Object[] row) {
        return new SosAlertProjection(
                toLong(row[0]),
                toLong(row[1]),
                toLocalDateTime(row[2]),
                toStringValue(row[3]),
                toStringValue(row[4]),
                toLocalDateTime(row[5]),
                toLongNullable(row[6]),
                toLocalDateTime(row[7]),
                toLongNullable(row[8])
        );
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

    private Long toLongNullable(Object value) {
        return value == null ? null : toLong(value);
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

    public static class SosAlertProjection {
        private final Long id;
        private final Long seniorId;
        private final LocalDateTime triggeredAt;
        private final String status;
        private final String comment;
        private final LocalDateTime acknowledgedAt;
        private final Long acknowledgedByUserId;
        private final LocalDateTime resolvedAt;
        private final Long resolvedByUserId;

        public SosAlertProjection(Long id, Long seniorId, LocalDateTime triggeredAt, String status, String comment,
                                  LocalDateTime acknowledgedAt, Long acknowledgedByUserId,
                                  LocalDateTime resolvedAt, Long resolvedByUserId) {
            this.id = id;
            this.seniorId = seniorId;
            this.triggeredAt = triggeredAt;
            this.status = status;
            this.comment = comment;
            this.acknowledgedAt = acknowledgedAt;
            this.acknowledgedByUserId = acknowledgedByUserId;
            this.resolvedAt = resolvedAt;
            this.resolvedByUserId = resolvedByUserId;
        }

        public Long getId() {
            return id;
        }

        public Long getSeniorId() {
            return seniorId;
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

        public LocalDateTime getAcknowledgedAt() {
            return acknowledgedAt;
        }

        public Long getAcknowledgedByUserId() {
            return acknowledgedByUserId;
        }

        public LocalDateTime getResolvedAt() {
            return resolvedAt;
        }

        public Long getResolvedByUserId() {
            return resolvedByUserId;
        }
    }
}
