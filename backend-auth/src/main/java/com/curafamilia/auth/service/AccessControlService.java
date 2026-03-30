package com.curafamilia.auth.service;

import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.repository.AccessControlRepository;
import com.curafamilia.auth.security.AuthenticatedUser;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.core.Response;

public class AccessControlService {

    public AccessControlRepository.UserProjection requireActiveUser(EntityManager entityManager, Long userId) {
        AccessControlRepository repository = new AccessControlRepository(entityManager);
        return repository.findActiveUser(userId)
                .orElseThrow(() -> new ApiException(Response.Status.UNAUTHORIZED, "User account not found or inactive."));
    }

    public AccessControlRepository.UserProjection requireSenior(EntityManager entityManager, Long seniorId) {
        AccessControlRepository repository = new AccessControlRepository(entityManager);
        return repository.findActiveSenior(seniorId)
                .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Senior not found."));
    }

    public void assertActorCanAccessSenior(EntityManager entityManager, AuthenticatedUser actor, Long seniorId) {
        requireActiveUser(entityManager, actor.userId());
        requireSenior(entityManager, seniorId);

        if (actor.isSenior()) {
            if (!actor.userId().equals(seniorId)) {
                throw new ApiException(Response.Status.FORBIDDEN, "Senior can only access their own data.");
            }
            return;
        }

        if (!actor.isFamily()) {
            throw new ApiException(Response.Status.FORBIDDEN, "Unsupported role for this action.");
        }

        AccessControlRepository repository = new AccessControlRepository(entityManager);
        if (!repository.isFamilyLinkedToSenior(actor.userId(), seniorId)) {
            throw new ApiException(Response.Status.FORBIDDEN, "Family account is not linked to this senior.");
        }
    }

    public void assertActorIsFamily(EntityManager entityManager, AuthenticatedUser actor) {
        requireActiveUser(entityManager, actor.userId());
        if (!actor.isFamily()) {
            throw new ApiException(Response.Status.FORBIDDEN, "Only family accounts can perform this action.");
        }
    }

    public void assertActorIsSeniorOwner(EntityManager entityManager, AuthenticatedUser actor, Long seniorId) {
        requireActiveUser(entityManager, actor.userId());
        requireSenior(entityManager, seniorId);
        if (!actor.isSenior() || !actor.userId().equals(seniorId)) {
            throw new ApiException(Response.Status.FORBIDDEN, "Only this senior account can perform this action.");
        }
    }
}
