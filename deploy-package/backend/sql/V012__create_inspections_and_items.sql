-- ============================================================
-- Flyway Migration V012
-- 创建消防检查表和检查项目表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS inspections (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  inspect_no VARCHAR(64) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  unit_name VARCHAR(128) DEFAULT NULL,
  inspect_type INT DEFAULT 1,
  inspector VARCHAR(64) DEFAULT NULL,
  result INT DEFAULT 1,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消防检查';

CREATE TABLE IF NOT EXISTS inspection_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  inspection_id BIGINT DEFAULT NULL,
  item_name VARCHAR(128) DEFAULT NULL,
  standard VARCHAR(256) DEFAULT NULL,
  result INT DEFAULT 1,
  remark TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inspection_id (inspection_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='检查项目';
