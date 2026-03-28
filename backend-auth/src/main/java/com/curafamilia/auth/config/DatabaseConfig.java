package com.curafamilia.auth.config;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public final class DatabaseConfig {
    private static final Properties PROPERTIES = loadProperties();

    private DatabaseConfig() {
    }

    private static Properties loadProperties() {
        Properties properties = new Properties();
        try (InputStream inputStream = DatabaseConfig.class.getClassLoader().getResourceAsStream("backend.properties")) {
            if (inputStream == null) {
                throw new IllegalStateException("backend.properties not found in classpath.");
            }
            properties.load(inputStream);
            return properties;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to load backend.properties", exception);
        }
    }

    public static Properties getProperties() {
        return PROPERTIES;
    }

    public static String getRequired(String key) {
        String value = PROPERTIES.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required property: " + key);
        }
        return value.trim();
    }

    public static int getInt(String key, int defaultValue) {
        String value = PROPERTIES.getProperty(key);
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return Integer.parseInt(value.trim());
    }
}
