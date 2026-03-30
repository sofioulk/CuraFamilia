package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.SosAlertHistoryResponse;
import com.curafamilia.auth.dto.SosAlertResponse;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.realtime.RealtimeEventBus;
import com.curafamilia.auth.repository.SosManagementRepository;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.security.SeniorAccessResolver;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.ws.rs.core.Response;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

public class SosManagementService {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private final AccessControlService accessControlService = new AccessControlService();
    private final SeniorAccessResolver seniorAccessResolver = new SeniorAccessResolver();

    public SosAlertHistoryResponse getHistory(AuthenticatedUser actor, Long requestedSeniorId, Integer limitValue) {
        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);
            SosManagementRepository repository = new SosManagementRepository(entityManager);
            int limit = normalizeLimit(limitValue);
            List<SosAlertResponse.AlertData> alerts = repository.findHistoryBySenior(seniorId, limit).stream()
                    .map(this::toAlertData)
                    .toList();
            return new SosAlertHistoryResponse(seniorId, alerts.size(), alerts);
        } finally {
            entityManager.close();
        }
    }

    public SosAlertResponse acknowledge(AuthenticatedUser actor, Long alertId) {
        if (alertId == null || alertId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "alertId is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            accessControlService.assertActorIsFamily(entityManager, actor);
            SosManagementRepository repository = new SosManagementRepository(entityManager);
            SosManagementRepository.SosAlertProjection existing = repository.findById(alertId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "SOS alert not found."));
            accessControlService.assertActorCanAccessSenior(entityManager, actor, existing.getSeniorId());

            if ("resolved".equalsIgnoreCase(existing.getStatus())) {
                throw new ApiException(Response.Status.CONFLICT, "Resolved SOS alerts cannot be acknowledged.");
            }

            LocalDateTime acknowledgedAt = LocalDateTime.now();
            transaction.begin();
            repository.acknowledge(alertId, actor.userId(), acknowledgedAt);
            transaction.commit();

            SosManagementRepository.SosAlertProjection updated = repository.findById(alertId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "SOS alert not found."));
            SosAlertResponse response = new SosAlertResponse("Alerte SOS accusee de reception.", toAlertData(updated), false);
            RealtimeEventBus.publish("sos:acknowledged", updated.getSeniorId(), actor, response.getAlert());
            return response;
        } catch (ApiException exception) {
            rollback(transaction);
            throw exception;
        } catch (Exception exception) {
            rollback(transaction);
            throw exception;
        } finally {
            entityManager.close();
        }
    }

    public SosAlertResponse resolve(AuthenticatedUser actor, Long alertId) {
        if (alertId == null || alertId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "alertId is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            accessControlService.assertActorIsFamily(entityManager, actor);
            SosManagementRepository repository = new SosManagementRepository(entityManager);
            SosManagementRepository.SosAlertProjection existing = repository.findById(alertId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "SOS alert not found."));
            accessControlService.assertActorCanAccessSenior(entityManager, actor, existing.getSeniorId());

            if ("resolved".equalsIgnoreCase(existing.getStatus())) {
                SosAlertResponse.AlertData alert = toAlertData(existing);
                return new SosAlertResponse("Alerte SOS deja resolue.", alert, false);
            }

            LocalDateTime resolvedAt = LocalDateTime.now();
            transaction.begin();
            repository.resolve(alertId, actor.userId(), resolvedAt);
            transaction.commit();

            SosManagementRepository.SosAlertProjection updated = repository.findById(alertId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "SOS alert not found."));
            SosAlertResponse response = new SosAlertResponse("Alerte SOS resolue.", toAlertData(updated), false);
            RealtimeEventBus.publish("sos:resolved", updated.getSeniorId(), actor, response.getAlert());
            return response;
        } catch (ApiException exception) {
            rollback(transaction);
            throw exception;
        } catch (Exception exception) {
            rollback(transaction);
            throw exception;
        } finally {
            entityManager.close();
        }
    }

    private int normalizeLimit(Integer limitValue) {
        if (limitValue == null) {
            return 20;
        }
        if (limitValue <= 0 || limitValue > 100) {
            throw new ApiException(Response.Status.BAD_REQUEST, "limit must be between 1 and 100.");
        }
        return limitValue;
    }

    private SosAlertResponse.AlertData toAlertData(SosManagementRepository.SosAlertProjection projection) {
        return new SosAlertResponse.AlertData(
                projection.getId(),
                projection.getSeniorId(),
                normalizeStatus(projection.getStatus()),
                formatDateTime(projection.getTriggeredAt()),
                projection.getComment(),
                formatDateTime(projection.getAcknowledgedAt()),
                projection.getAcknowledgedByUserId(),
                formatDateTime(projection.getResolvedAt()),
                projection.getResolvedByUserId()
        );
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? null : value.format(DATE_TIME_FORMATTER);
    }

    private String normalizeStatus(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private void rollback(EntityTransaction transaction) {
        if (transaction != null && transaction.isActive()) {
            transaction.rollback();
        }
    }
}
