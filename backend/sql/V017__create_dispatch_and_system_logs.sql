-- ============================================================
-- Flyway Migration V017
-- 创建接警处置记录表和系统日志表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS dispatch_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dispatch_no VARCHAR(64) DEFAULT NULL,
  alarm_id BIGINT DEFAULT NULL,
  handler VARCHAR(64) DEFAULT NULL,
  result TEXT DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alarm_id (alarm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='接警处置记录';

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  level VARCHAR(16) DEFAULT 'info',
  module VARCHAR(64) DEFAULT NULL,
  action VARCHAR(64) DEFAULT NULL,
  user_id VARCHAR(64) DEFAULT NULL,
  username VARCHAR(64) DEFAULT NULL,
  ip VARCHAR(64) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_level (level),
  INDEX idx_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统日志';
