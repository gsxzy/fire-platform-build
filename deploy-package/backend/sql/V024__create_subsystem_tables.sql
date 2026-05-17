-- ============================================================
-- Flyway Migration V024
-- 创建子系统表、子系统设备表和子系统指标表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS subsystems (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) DEFAULT NULL,
  type VARCHAR(32) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='子系统';

CREATE TABLE IF NOT EXISTS subsystem_devices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  subsystem_id BIGINT DEFAULT NULL,
  device_id VARCHAR(64) DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_subsystem_id (subsystem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='子系统设备';

CREATE TABLE IF NOT EXISTS subsystem_metrics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  subsystem_id BIGINT DEFAULT NULL,
  metric_name VARCHAR(64) DEFAULT NULL,
  value DECIMAL(10,2) DEFAULT NULL,
  unit VARCHAR(32) DEFAULT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_subsystem_id (subsystem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='子系统指标';
