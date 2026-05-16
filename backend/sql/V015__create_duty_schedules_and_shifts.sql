-- ============================================================
-- Flyway Migration V015
-- 创建值班排班表和班次表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS duty_schedules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  schedule_no VARCHAR(64) DEFAULT NULL,
  user_id VARCHAR(64) DEFAULT NULL,
  user_name VARCHAR(64) DEFAULT NULL,
  duty_date DATE DEFAULT NULL,
  shift_id BIGINT DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_duty_date (duty_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='值班排班';

CREATE TABLE IF NOT EXISTS duty_shifts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  shift_name VARCHAR(64) DEFAULT NULL,
  start_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班次';
