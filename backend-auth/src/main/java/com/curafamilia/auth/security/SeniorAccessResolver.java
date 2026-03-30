package com.curafamilia.auth.security;

import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.service.AccessControlService;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.core.Response;

public class SeniorAccessResolver {
    private final AccessControlService accessControlService = new AccessControlService();

    public Long resolveAccessibleSeniorId(EntityManager entityManager,
                                          AuthenticatedUser actor,
                                          Long requestedSeniorId) {
        accessControlService.requireActiveUser(entityManager, actor.userId());

        if (actor.isSenior()) {
            accessControlService.assertActorIsSeniorOwner(entityManager, actor, actor.userId());
            return actor.userId();
        }

        if (!actor.isFamily()) {
            throw new ApiException(Response.Status.FORBIDDEN, "Unsupported role for this action.");
        }

        if (requestedSeniorId == null || requestedSeniorId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "seniorId is required for family access.");
        }

        accessControlService.assertActorCanAccessSenior(entityManager, actor, requestedSeniorId);
        return requestedSeniorId;
    }

    public Long resolveSeniorOwnerId(EntityManager entityManager, AuthenticatedUser actor) {
        accessControlService.assertActorIsSeniorOwner(entityManager, actor, actor.userId());
        return actor.userId();
    }
}
