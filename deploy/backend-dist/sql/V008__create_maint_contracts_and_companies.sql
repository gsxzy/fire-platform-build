-- ============================================================
-- Flyway Migration V008
-- 创建维保合同表和维保单位表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS maint_contracts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  contract_no VARCHAR(64) DEFAULT NULL,
  company_name VARCHAR(128) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  amount DECIMAL(12,2) DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='维保合同';

CREATE TABLE IF NOT EXISTS maint_companies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_name VARCHAR(128) DEFAULT NULL,
  contact VARCHAR(64) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  address VARCHAR(256) DEFAULT NULL,
  qualification VARCHAR(128) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='维保单位';
