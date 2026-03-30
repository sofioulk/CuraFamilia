-- CuraFamilia production hardening and family-dashboard extensions
-- Rollback notes:
--   1. Before removing any columns, export data from link_invitations, user_profiles, and new SOS metadata fields.
--   2. Reverse order:
--      - Drop link_invitations and user_profiles if the application no longer depends on them.
--      - Remove added columns from family_senior_links, medication_takes, sos_alerts, and users.
--   3. This file is idempotent and can be applied multiple times safely on MySQL 8.x.

SET NAMES utf8mb4;

ALTER TABLE users ADD COLUMN IF NOT EXISTS age INT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_condition VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allergies TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(120) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(30) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(60) NULL;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT(20) UNSIGNED NOT NULL,
  date_of_birth DATE NULL,
  city VARCHAR(100) NULL,
  chronic_diseases TEXT NULL,
  blood_type ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL,
  allergies TEXT NULL,
  main_doctor_name VARCHAR(120) NULL,
  emergency_contact_name VARCHAR(120) NULL,
  emergency_contact_phone VARCHAR(30) NULL,
  emergency_contact_relation VARCHAR(60) NULL,
  special_note VARCHAR(255) NULL,
  preferred_language VARCHAR(10) NOT NULL DEFAULT 'fr',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Africa/Casablanca',
  audio_reminders_enabled TINYINT(1) NOT NULL DEFAULT 1,
  text_size ENUM('small','medium','large') NOT NULL DEFAULT 'large',
  notifications_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS chronic_diseases TEXT NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS blood_type ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS allergies TEXT NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS main_doctor_name VARCHAR(120) NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(120) NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(30) NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(60) NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS special_note VARCHAR(255) NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) NOT NULL DEFAULT 'fr';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Africa/Casablanca';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS audio_reminders_enabled TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS text_size ENUM('small','medium','large') NOT NULL DEFAULT 'large';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notifications_enabled TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS link_invitations (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  code CHAR(6) NOT NULL,
  senior_user_id BIGINT(20) UNSIGNED NOT NULL,
  created_by_user_id BIGINT(20) UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  used_by_family_user_id BIGINT(20) UNSIGNED NULL,
  status ENUM('active','used','expired','revoked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_link_invitations_code (code),
  KEY idx_link_invitations_status (status),
  KEY idx_link_invitations_senior (senior_user_id),
  CONSTRAINT fk_link_invitation_senior FOREIGN KEY (senior_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_link_invitation_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE family_senior_links ADD COLUMN IF NOT EXISTS link_role VARCHAR(40) NOT NULL DEFAULT 'primary';
ALTER TABLE family_senior_links ADD COLUMN IF NOT EXISTS linked_at DATETIME NULL;
ALTER TABLE family_senior_links ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE family_senior_links ADD COLUMN IF NOT EXISTS unlinked_at DATETIME NULL;
UPDATE family_senior_links
SET linked_at = COALESCE(linked_at, created_at),
    is_active = COALESCE(is_active, 1)
WHERE linked_at IS NULL OR is_active IS NULL;

ALTER TABLE medication_takes ADD COLUMN IF NOT EXISTS delay_minutes INT NULL;
ALTER TABLE medication_takes ADD COLUMN IF NOT EXISTS status_source VARCHAR(30) NULL;

ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS acknowledged_at DATETIME NULL;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS acknowledged_by_user_id BIGINT(20) UNSIGNED NULL;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS resolved_at DATETIME NULL;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS resolved_by_user_id BIGINT(20) UNSIGNED NULL;
