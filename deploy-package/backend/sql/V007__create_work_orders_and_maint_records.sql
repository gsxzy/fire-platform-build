-- ============================================================
-- Flyway Migration V007
-- 创建维保工单表和维保记录表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS work_orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(64) DEFAULT NULL COMMENT '工单编号',
  order_type INT DEFAULT 1 COMMENT '工单类型',
  device_name VARCHAR(128) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  unit_name VARCHAR(128) DEFAULT NULL,
  fault_desc TEXT DEFAULT NULL,
  priority INT DEFAULT 1,
  status INT DEFAULT 0 COMMENT '0待处理 1处理中 2已完成',
  assignee_name VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='维保工单';

CREATE TABLE IF NOT EXISTS maint_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  record_no VARCHAR(64) DEFAULT NULL,
  order_id BIGINT DEFAULT NULL,
  device_id VARCHAR(64) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  result VARCHAR(16) DEFAULT NULL,
  cost DECIMAL(10,2) DEFAULT NULL,
  executor VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='维保记录';
