-- CuraFamilia schema (reconstructed from phpMyAdmin screenshots)
-- MySQL 8.x

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  email VARCHAR(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  phone VARCHAR(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  role ENUM('famille', 'senior') COLLATE utf8mb4_unicode_ci NOT NULL,
  password_hash VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  senior_id BIGINT(20) UNSIGNED NOT NULL,
  specialty VARCHAR(120) COLLATE utf8mb4_general_ci NOT NULL,
  appointment_at DATETIME NOT NULL,
  doctor_name VARCHAR(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  notes VARCHAR(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  status ENUM('scheduled', 'done', 'cancelled') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_appointments_senior_id (senior_id),
  KEY idx_appointments_appointment_at (appointment_at),
  CONSTRAINT fk_appointments_senior
    FOREIGN KEY (senior_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  senior_id BIGINT(20) UNSIGNED NOT NULL,
  session_date DATE NOT NULL,
  status ENUM('open', 'closed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'open',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_chatbot_sessions_senior_date (senior_id, session_date),
  KEY idx_chatbot_sessions_started_at (started_at),
  CONSTRAINT fk_chatbot_sessions_senior
    FOREIGN KEY (senior_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT(20) UNSIGNED NOT NULL,
  sender ENUM('senior', 'bot', 'system') COLLATE utf8mb4_general_ci NOT NULL,
  message TEXT COLLATE utf8mb4_general_ci NOT NULL,
  intent VARCHAR(60) COLLATE utf8mb4_general_ci DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chatbot_messages_session_id (session_id),
  KEY idx_chatbot_messages_created_at (created_at),
  CONSTRAINT fk_chatbot_messages_session
    FOREIGN KEY (session_id) REFERENCES chatbot_sessions (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS chatbot_daily_summaries (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  senior_id BIGINT(20) UNSIGNED NOT NULL,
  summary_date DATE NOT NULL,
  mood VARCHAR(40) COLLATE utf8mb4_general_ci DEFAULT NULL,
  pain VARCHAR(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  medication_topic TINYINT(1) NOT NULL DEFAULT 0,
  appointment_topic TINYINT(1) NOT NULL DEFAULT 0,
  needs_attention TINYINT(1) NOT NULL DEFAULT 0,
  summary_text TEXT COLLATE utf8mb4_general_ci NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_chatbot_daily_summaries_senior_date (senior_id, summary_date),
  KEY idx_chatbot_daily_summaries_needs_attention (needs_attention),
  CONSTRAINT fk_chatbot_daily_summaries_senior
    FOREIGN KEY (senior_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daily_checkins (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  senior_id BIGINT(20) UNSIGNED NOT NULL,
  question VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
  answer VARCHAR(100) COLLATE utf8mb4_general_ci NOT NULL,
  answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daily_checkins_senior_id (senior_id),
  KEY idx_daily_checkins_answered_at (answered_at),
  CONSTRAINT fk_daily_checkins_senior
    FOREIGN KEY (senior_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS family_senior_links (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  family_user_id BIGINT(20) UNSIGNED NOT NULL,
  senior_user_id BIGINT(20) UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_family_senior_links_pair (family_user_id, senior_user_id),
  KEY idx_family_senior_links_senior_user_id (senior_user_id),
  CONSTRAINT fk_family_senior_links_family_user
    FOREIGN KEY (family_user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_family_senior_links_senior_user
    FOREIGN KEY (senior_user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS medications (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  senior_id BIGINT(20) UNSIGNED NOT NULL,
  name VARCHAR(120) COLLATE utf8mb4_general_ci NOT NULL,
  dosage VARCHAR(80) COLLATE utf8mb4_general_ci NOT NULL,
  scheduled_time TIME NOT NULL,
  frequency VARCHAR(60) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Tous les jours',
  period VARCHAR(40) COLLATE utf8mb4_general_ci DEFAULT NULL,
  instruction VARCHAR(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_medications_senior_id (senior_id),
  KEY idx_medications_scheduled_time (scheduled_time),
  CONSTRAINT fk_medications_senior
    FOREIGN KEY (senior_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS medication_takes (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  medication_id BIGINT(20) NOT NULL,
  senior_id BIGINT(20) UNSIGNED NOT NULL,
  scheduled_at DATETIME NOT NULL,
  taken_at DATETIME DEFAULT NULL,
  status ENUM('taken', 'pending', 'upcoming', 'missed') COLLATE utf8mb4_general_ci NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_medication_takes_medication_scheduled (medication_id, scheduled_at),
  KEY idx_medication_takes_senior_id (senior_id),
  CONSTRAINT fk_medication_takes_medication
    FOREIGN KEY (medication_id) REFERENCES medications (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_medication_takes_senior
    FOREIGN KEY (senior_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT(20) UNSIGNED NOT NULL,
  token_hash VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_password_reset_tokens_token_hash (token_hash),
  KEY idx_password_reset_tokens_user_id (user_id),
  CONSTRAINT fk_password_reset_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sos_alerts (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  senior_id BIGINT(20) UNSIGNED NOT NULL,
  triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('triggered', 'acknowledged', 'resolved') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'triggered',
  comment VARCHAR(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sos_alerts_senior_id (senior_id),
  KEY idx_sos_alerts_triggered_at (triggered_at),
  CONSTRAINT fk_sos_alerts_senior
    FOREIGN KEY (senior_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
