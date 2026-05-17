-- ============================================================
-- Flyway Migration V009
-- 创建巡检计划表和巡检记录表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS patrol_plans (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  plan_name VARCHAR(128) DEFAULT NULL,
  patrol_type INT DEFAULT 1,
  responsible_name VARCHAR(64) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  status INT DEFAULT 1,
  frequency VARCHAR(32) DEFAULT 'daily',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='巡检计划';

CREATE TABLE IF NOT EXISTS patrol_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  patrol_no VARCHAR(64) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  unit_name VARCHAR(128) DEFAULT NULL,
  patrol_user_name VARCHAR(64) DEFAULT NULL,
  result INT DEFAULT 1,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='巡检记录';
