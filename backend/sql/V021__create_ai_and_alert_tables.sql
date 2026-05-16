-- ============================================================
-- Flyway Migration V021
-- 创建 AI 决策表和智能预警表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_decisions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  decision_no VARCHAR(64) DEFAULT NULL,
  scene VARCHAR(256) DEFAULT NULL,
  suggestion TEXT DEFAULT NULL,
  confidence INT DEFAULT 0,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI决策';

CREATE TABLE IF NOT EXISTS smart_alerts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  alert_no VARCHAR(64) DEFAULT NULL,
  device_id VARCHAR(64) DEFAULT NULL,
  rule_id BIGINT DEFAULT NULL,
  level INT DEFAULT 1,
  message TEXT DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_id (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='智能预警';
