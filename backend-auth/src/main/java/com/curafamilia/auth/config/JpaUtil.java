package com.curafamilia.auth.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Persistence;
import java.util.HashMap;
import java.util.Map;

public final class JpaUtil {
    private static final EntityManagerFactory ENTITY_MANAGER_FACTORY = buildEntityManagerFactory();

    private JpaUtil() {
    }

    private static EntityManagerFactory buildEntityManagerFactory() {
        Map<String, Object> overrides = new HashMap<>();
        overrides.put("jakarta.persistence.jdbc.url", DatabaseConfig.getRequired("db.url"));
        overrides.put("jakarta.persistence.jdbc.user", DatabaseConfig.getRequired("db.username"));
        overrides.put("jakarta.persistence.jdbc.password", DatabaseConfig.getProperties().getProperty("db.password", ""));
        return Persistence.createEntityManagerFactory("curafamilia-auth-pu", overrides);
    }

    public static EntityManager createEntityManager() {
        return ENTITY_MANAGER_FACTORY.createEntityManager();
    }

    public static void shutdown() {
        if (ENTITY_MANAGER_FACTORY.isOpen()) {
            ENTITY_MANAGER_FACTORY.close();
        }
    }
}
