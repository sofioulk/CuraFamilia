package com.curafamilia.auth.service;

import jakarta.persistence.EntityManager;

public final class SchemaMigrationService {
    private SchemaMigrationService() {
    }

    public static void ensureLatestSchema(EntityManager entityManager) {
        // Schema changes now live in explicit SQL migration files under backend-auth/db/migrations.
        // This method remains only as a backwards-compatible no-op for older call sites.
    }
}
