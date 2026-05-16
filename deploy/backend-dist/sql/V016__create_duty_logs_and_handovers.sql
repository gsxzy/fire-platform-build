-- ============================================================
-- Flyway Migration V016
-- 创建值班日志表和交接班记录表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS duty_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  log_no VARCHAR(64) DEFAULT NULL,
  schedule_id BIGINT DEFAULT NULL,
  user_id VARCHAR(64) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  events TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_schedule_id (schedule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='值班日志';

CREATE TABLE IF NOT EXISTS duty_handovers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  handover_no VARCHAR(64) DEFAULT NULL,
  from_user_id VARCHAR(64) DEFAULT NULL,
  to_user_id VARCHAR(64) DEFAULT NULL,
  shift_id BIGINT DEFAULT NULL,
  content TEXT DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_from_user (from_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交接班记录';
