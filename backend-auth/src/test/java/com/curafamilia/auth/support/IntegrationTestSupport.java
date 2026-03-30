package com.curafamilia.auth.support;

import com.curafamilia.auth.config.DatabaseConfig;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public final class IntegrationTestSupport {
    private IntegrationTestSupport() {
    }

    public static void resetDatabase() throws Exception {
        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("DROP ALL OBJECTS");
            String schemaSql = readClasspathResource("/schema-h2.sql");
            for (String sql : schemaSql.split(";\\s*\\r?\\n")) {
                String trimmed = sql.trim();
                if (!trimmed.isEmpty()) {
                    statement.execute(trimmed);
                }
            }
        }
    }

    public static long insertUser(String name, String email, String role) throws Exception {
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "INSERT INTO users(name, email, role, password_hash, is_active) VALUES (?, ?, ?, ?, TRUE)",
                     Statement.RETURN_GENERATED_KEYS)) {
            statement.setString(1, name);
            statement.setString(2, email);
            statement.setString(3, role);
            statement.setString(4, "hash");
            statement.executeUpdate();
            try (var keys = statement.getGeneratedKeys()) {
                keys.next();
                return keys.getLong(1);
            }
        }
    }

    public static void linkFamily(long familyUserId, long seniorUserId) throws Exception {
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "INSERT INTO family_senior_links(family_user_id, senior_user_id, link_role, linked_at, is_active) " +
                             "VALUES (?, ?, 'primary', CURRENT_TIMESTAMP, TRUE)")) {
            statement.setLong(1, familyUserId);
            statement.setLong(2, seniorUserId);
            statement.executeUpdate();
        }
    }

    public static long insertMedication(long seniorId, String name, String dosage, LocalTime scheduledTime) throws Exception {
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "INSERT INTO medications(senior_id, name, dosage, scheduled_time, frequency, period, is_active) " +
                             "VALUES (?, ?, ?, ?, 'Tous les jours', 'matin', TRUE)",
                     Statement.RETURN_GENERATED_KEYS)) {
            statement.setLong(1, seniorId);
            statement.setString(2, name);
            statement.setString(3, dosage);
            statement.setTime(4, java.sql.Time.valueOf(scheduledTime));
            statement.executeUpdate();
            try (var keys = statement.getGeneratedKeys()) {
                keys.next();
                return keys.getLong(1);
            }
        }
    }

    public static void insertCheckin(long seniorId, String question, String answer, LocalDateTime answeredAt) throws Exception {
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "INSERT INTO daily_checkins(senior_id, question, answer, answered_at) VALUES (?, ?, ?, ?)")) {
            statement.setLong(1, seniorId);
            statement.setString(2, question);
            statement.setString(3, answer);
            statement.setTimestamp(4, Timestamp.valueOf(answeredAt));
            statement.executeUpdate();
        }
    }

    public static void insertDailySummary(long seniorId, LocalDate date, String mood, String summaryText) throws Exception {
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "INSERT INTO chatbot_daily_summaries(senior_id, summary_date, mood, pain, medication_topic, appointment_topic, needs_attention, summary_text) " +
                             "VALUES (?, ?, ?, 'aucune', FALSE, FALSE, FALSE, ?)")) {
            statement.setLong(1, seniorId);
            statement.setDate(2, java.sql.Date.valueOf(date));
            statement.setString(3, mood);
            statement.setString(4, summaryText);
            statement.executeUpdate();
        }
    }

    public static long insertSosAlert(long seniorId, String status) throws Exception {
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "INSERT INTO sos_alerts(senior_id, triggered_at, status, comment) VALUES (?, CURRENT_TIMESTAMP, ?, 'help')",
                     Statement.RETURN_GENERATED_KEYS)) {
            statement.setLong(1, seniorId);
            statement.setString(2, status);
            statement.executeUpdate();
            try (var keys = statement.getGeneratedKeys()) {
                keys.next();
                return keys.getLong(1);
            }
        }
    }

    public static void expireInvitation(String code) throws Exception {
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "UPDATE link_invitations SET expires_at = DATEADD('DAY', -1, CURRENT_TIMESTAMP), status = 'active' WHERE code = ?")) {
            statement.setString(1, code);
            statement.executeUpdate();
        }
    }

    public static int countRows(String tableName) throws Exception {
        try (Connection connection = openConnection();
             Statement statement = connection.createStatement();
             var resultSet = statement.executeQuery("SELECT COUNT(*) FROM " + tableName)) {
            resultSet.next();
            return resultSet.getInt(1);
        }
    }

    private static Connection openConnection() throws Exception {
        return DriverManager.getConnection(
                DatabaseConfig.getRequired("db.url"),
                DatabaseConfig.getRequired("db.username"),
                DatabaseConfig.getProperties().getProperty("db.password", "")
        );
    }

    private static String readClasspathResource(String resourcePath) throws Exception {
        try (InputStream inputStream = IntegrationTestSupport.class.getResourceAsStream(resourcePath)) {
            if (inputStream == null) {
                throw new IllegalStateException("Missing test resource: " + resourcePath);
            }
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
