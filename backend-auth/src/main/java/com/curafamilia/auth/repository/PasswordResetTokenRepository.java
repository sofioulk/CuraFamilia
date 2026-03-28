package com.curafamilia.auth.repository;

import com.curafamilia.auth.entity.PasswordResetToken;
import jakarta.persistence.EntityManager;

public class PasswordResetTokenRepository {
    private final EntityManager entityManager;

    public PasswordResetTokenRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public PasswordResetToken save(PasswordResetToken token) {
        entityManager.persist(token);
        return token;
    }
}
