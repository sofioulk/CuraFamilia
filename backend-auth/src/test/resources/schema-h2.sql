CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(30),
  role VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  age INT,
  city VARCHAR(100),
  medical_condition VARCHAR(255),
  blood_type VARCHAR(10),
  allergies CLOB,
  emergency_contact_name VARCHAR(120),
  emergency_contact_phone VARCHAR(30),
  emergency_contact_relation VARCHAR(60),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY,
  date_of_birth DATE,
  city VARCHAR(100),
  chronic_diseases CLOB,
  blood_type VARCHAR(10),
  allergies CLOB,
  main_doctor_name VARCHAR(120),
  emergency_contact_name VARCHAR(120),
  emergency_contact_phone VARCHAR(30),
  emergency_contact_relation VARCHAR(60),
  special_note VARCHAR(255),
  preferred_language VARCHAR(10) NOT NULL DEFAULT 'fr',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Africa/Casablanca',
  audio_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  text_size VARCHAR(10) NOT NULL DEFAULT 'large',
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  senior_id BIGINT NOT NULL,
  specialty VARCHAR(120) NOT NULL,
  appointment_at TIMESTAMP NOT NULL,
  doctor_name VARCHAR(120),
  notes VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  senior_id BIGINT NOT NULL,
  session_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_chatbot_sessions_senior_date UNIQUE (senior_id, session_date)
);

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT NOT NULL,
  sender VARCHAR(20) NOT NULL,
  message CLOB NOT NULL,
  intent VARCHAR(60),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chatbot_daily_summaries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  senior_id BIGINT NOT NULL,
  summary_date DATE NOT NULL,
  mood VARCHAR(40),
  pain VARCHAR(80),
  medication_topic BOOLEAN NOT NULL DEFAULT FALSE,
  appointment_topic BOOLEAN NOT NULL DEFAULT FALSE,
  needs_attention BOOLEAN NOT NULL DEFAULT FALSE,
  summary_text CLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_chatbot_daily_summaries_senior_date UNIQUE (senior_id, summary_date)
);

CREATE TABLE IF NOT EXISTS daily_checkins (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  senior_id BIGINT NOT NULL,
  question VARCHAR(255) NOT NULL,
  answer VARCHAR(100) NOT NULL,
  answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_senior_links (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  family_user_id BIGINT NOT NULL,
  senior_user_id BIGINT NOT NULL,
  link_role VARCHAR(40) NOT NULL DEFAULT 'primary',
  linked_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  unlinked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_family_senior_links_pair UNIQUE (family_user_id, senior_user_id)
);

CREATE TABLE IF NOT EXISTS medications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  senior_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  dosage VARCHAR(80) NOT NULL,
  scheduled_time TIME NOT NULL,
  frequency VARCHAR(60) NOT NULL DEFAULT 'Tous les jours',
  period VARCHAR(40),
  instruction VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medication_takes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  medication_id BIGINT NOT NULL,
  senior_id BIGINT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  taken_at TIMESTAMP,
  status VARCHAR(20) NOT NULL,
  delay_minutes INT,
  status_source VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_medication_takes_medication_scheduled UNIQUE (medication_id, scheduled_at)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sos_alerts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  senior_id BIGINT NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'triggered',
  comment VARCHAR(255),
  acknowledged_at TIMESTAMP,
  acknowledged_by_user_id BIGINT,
  resolved_at TIMESTAMP,
  resolved_by_user_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS link_invitations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code CHAR(6) NOT NULL,
  senior_user_id BIGINT NOT NULL,
  created_by_user_id BIGINT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  used_by_family_user_id BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
