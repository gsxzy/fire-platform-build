-- ============================================================
-- Flyway Migration V010
-- 创建隐患管理表和应急预案表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS hazards (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  hazard_no VARCHAR(64) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  unit_name VARCHAR(128) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  level INT DEFAULT 1,
  status INT DEFAULT 0,
  rectification TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='隐患管理';

CREATE TABLE IF NOT EXISTS plans (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  plan_no VARCHAR(64) DEFAULT NULL,
  name VARCHAR(128) DEFAULT NULL,
  type VARCHAR(32) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应急预案';
