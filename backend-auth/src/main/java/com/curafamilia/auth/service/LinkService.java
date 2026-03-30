package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.LinkGenerateRequest;
import com.curafamilia.auth.dto.LinkGenerateResponse;
import com.curafamilia.auth.dto.LinkedSeniorItem;
import com.curafamilia.auth.dto.LinkedSeniorsResponse;
import com.curafamilia.auth.dto.LinkUseRequest;
import com.curafamilia.auth.dto.LinkUseResponse;
import com.curafamilia.auth.dto.LinkVerifyRequest;
import com.curafamilia.auth.dto.LinkVerifyResponse;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.realtime.RealtimeEventBus;
import com.curafamilia.auth.repository.AccessControlRepository;
import com.curafamilia.auth.repository.LinkRepository;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.security.SeniorAccessResolver;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.ws.rs.core.Response;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

public class LinkService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final int DEFAULT_EXPIRY_DAYS = 7;
    private static final int MAX_EXPIRY_DAYS = 30;

    private final AccessControlService accessControlService = new AccessControlService();
    private final SeniorAccessResolver seniorAccessResolver = new SeniorAccessResolver();

    public LinkGenerateResponse generateCode(AuthenticatedUser actor, LinkGenerateRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            Long seniorId = seniorAccessResolver.resolveSeniorOwnerId(entityManager, actor);
            AccessControlRepository accessRepository = new AccessControlRepository(entityManager);
            AccessControlRepository.UserProjection senior = accessRepository.findActiveSenior(seniorId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Senior not found."));

            int expiresInDays = normalizeExpiryDays(request.getExpiresInDays());
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime expiresAt = now.plusDays(expiresInDays);

            LinkRepository linkRepository = new LinkRepository(entityManager);

            transaction.begin();
            linkRepository.expireInvitationsBefore(now);
            String code = generateUniqueCode(linkRepository, now);
            linkRepository.insertInvitation(code, senior.getId(), actor.userId(), expiresAt);
            transaction.commit();

            return new LinkGenerateResponse(
                    code,
                    formatDateTime(expiresAt),
                    mapLinkedSenior(senior, now)
            );
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

    public LinkVerifyResponse verifyCode(AuthenticatedUser actor, LinkVerifyRequest request) {
        String code = normalizeCode(request == null ? null : request.getCode());
        EntityManager entityManager = JpaUtil.createEntityManager();

        try {
            accessControlService.assertActorIsFamily(entityManager, actor);

            LocalDateTime now = LocalDateTime.now();
            LinkRepository linkRepository = new LinkRepository(entityManager);
            LinkRepository.InvitationProjection invitation = linkRepository.findLatestByCode(code)
                    .orElse(null);
            if (invitation == null) {
                return new LinkVerifyResponse(false, "Code introuvable.", null, null, false);
            }

            AccessControlRepository accessRepository = new AccessControlRepository(entityManager);
            AccessControlRepository.UserProjection senior = accessRepository.findActiveSenior(invitation.getSeniorUserId())
                    .orElse(null);
            LinkedSeniorItem seniorItem = senior == null
                    ? null
                    : mapLinkedSenior(senior, invitation.getExpiresAt());

            boolean alreadyLinked = senior != null
                    && accessRepository.isFamilyLinkedToSenior(actor.userId(), senior.getId());

            String normalizedStatus = normalizeStatus(invitation.getStatus());
            if (!"active".equals(normalizedStatus)) {
                String message = switch (normalizedStatus) {
                    case "used" -> "Code deja utilise.";
                    case "expired" -> "Code expire.";
                    case "revoked" -> "Code revoque.";
                    default -> "Code invalide.";
                };
                return new LinkVerifyResponse(false, message, formatDateTime(invitation.getExpiresAt()), seniorItem, alreadyLinked);
            }

            if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(now)) {
                return new LinkVerifyResponse(false, "Code expire.", formatDateTime(invitation.getExpiresAt()), seniorItem, alreadyLinked);
            }

            return new LinkVerifyResponse(true, "Code valide.", formatDateTime(invitation.getExpiresAt()), seniorItem, alreadyLinked);
        } finally {
            entityManager.close();
        }
    }

    public LinkUseResponse useCode(AuthenticatedUser actor, LinkUseRequest request) {
        String code = normalizeCode(request == null ? null : request.getCode());
        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();

        try {
            accessControlService.assertActorIsFamily(entityManager, actor);

            LocalDateTime now = LocalDateTime.now();
            LinkRepository linkRepository = new LinkRepository(entityManager);

            transaction.begin();
            linkRepository.expireInvitationsBefore(now);
            LinkRepository.InvitationProjection invitation = linkRepository.findActiveByCode(code, now)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Code invalide ou expire."));

            AccessControlRepository accessRepository = new AccessControlRepository(entityManager);
            AccessControlRepository.UserProjection senior = accessRepository.findActiveSenior(invitation.getSeniorUserId())
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Senior introuvable pour ce code."));

            linkRepository.upsertFamilySeniorLink(actor.userId(), senior.getId(), "primary", now);
            linkRepository.markInvitationAsUsed(invitation.getId(), actor.userId(), now);
            transaction.commit();

            LinkUseResponse response = new LinkUseResponse("Liaison etablie avec succes.", mapLinkedSenior(senior, now));
            RealtimeEventBus.publish("link:created", senior.getId(), actor, response.getSenior());
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

    public LinkedSeniorsResponse getMySeniors(AuthenticatedUser actor) {
        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            accessControlService.assertActorIsFamily(entityManager, actor);
            AccessControlRepository repository = new AccessControlRepository(entityManager);

            List<LinkedSeniorItem> seniors = repository.findLinkedSeniorsForFamily(actor.userId()).stream()
                    .map(projection -> new LinkedSeniorItem(
                            projection.getSeniorId(),
                            projection.getName(),
                            projection.getAge(),
                            projection.getCity(),
                            projection.getMedicalCondition(),
                            projection.getBloodType(),
                            formatDateTime(projection.getLinkedAt())
                    ))
                    .toList();

            return new LinkedSeniorsResponse(seniors.size(), seniors);
        } finally {
            entityManager.close();
        }
    }

    public LinkUseResponse unlink(AuthenticatedUser actor, Long seniorId) {
        if (seniorId == null || seniorId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "seniorId is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            accessControlService.assertActorIsFamily(entityManager, actor);
            accessControlService.assertActorCanAccessSenior(entityManager, actor, seniorId);

            AccessControlRepository accessRepository = new AccessControlRepository(entityManager);
            AccessControlRepository.UserProjection senior = accessRepository.findActiveSenior(seniorId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Senior not found."));

            LocalDateTime now = LocalDateTime.now();
            LinkRepository linkRepository = new LinkRepository(entityManager);
            transaction.begin();
            boolean changed = linkRepository.deactivateFamilySeniorLink(actor.userId(), seniorId, now);
            if (!changed) {
                throw new ApiException(Response.Status.NOT_FOUND, "Active family link not found.");
            }
            transaction.commit();

            LinkUseResponse response = new LinkUseResponse("Liaison retiree avec succes.", mapLinkedSenior(senior, now));
            RealtimeEventBus.publish("link:unlinked", seniorId, actor, response.getSenior());
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

    private int normalizeExpiryDays(Integer input) {
        if (input == null) {
            return DEFAULT_EXPIRY_DAYS;
        }
        if (input <= 0 || input > MAX_EXPIRY_DAYS) {
            throw new ApiException(Response.Status.BAD_REQUEST,
                    "expiresInDays must be between 1 and " + MAX_EXPIRY_DAYS + ".");
        }
        return input;
    }

    private String generateUniqueCode(LinkRepository repository, LocalDateTime now) {
        for (int i = 0; i < 30; i += 1) {
            String code = generateSixDigitCode();
            boolean exists = repository.findActiveByCode(code, now).isPresent();
            if (!exists) {
                return code;
            }
        }
        throw new ApiException(Response.Status.CONFLICT, "Unable to generate a unique code. Please retry.");
    }

    private String generateSixDigitCode() {
        int value = SECURE_RANDOM.nextInt(900000) + 100000;
        return String.valueOf(value);
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ApiException(Response.Status.BAD_REQUEST, "code is required.");
        }
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("\\d{6}")) {
            throw new ApiException(Response.Status.BAD_REQUEST, "code must be a 6-digit value.");
        }
        return normalized;
    }

    private String normalizeStatus(String status) {
        if (status == null) {
            return "";
        }
        return status.trim().toLowerCase(Locale.ROOT);
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return null;
        }
        return dateTime.format(DATE_TIME_FORMATTER);
    }

    private LinkedSeniorItem mapLinkedSenior(AccessControlRepository.UserProjection senior, LocalDateTime linkedAt) {
        return new LinkedSeniorItem(
                senior.getId(),
                senior.getName(),
                senior.getAge(),
                senior.getCity(),
                senior.getMedicalCondition(),
                senior.getBloodType(),
                formatDateTime(linkedAt)
        );
    }

    private void rollback(EntityTransaction transaction) {
        if (transaction != null && transaction.isActive()) {
            transaction.rollback();
        }
    }
}
