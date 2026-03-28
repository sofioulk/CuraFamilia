package com.curafamilia.auth.repository;

import com.curafamilia.auth.entity.UserProfile;
import jakarta.persistence.EntityManager;
import java.util.Optional;

public class SeniorProfileRepository {
    private final EntityManager entityManager;

    public SeniorProfileRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Optional<UserProfile> findBySeniorId(Long seniorId) {
        return Optional.ofNullable(entityManager.find(UserProfile.class, seniorId));
    }

    public UserProfile save(UserProfile profile) {
        // entityManager.merge automatically executes an INSERT if the entity doesn't exist,
        // or an UPDATE if it already exists, effectively reproducing the "ON DUPLICATE KEY UPDATE" behavior natively.
        return entityManager.merge(profile);
    }
}
