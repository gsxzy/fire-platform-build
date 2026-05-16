-- ============================================================
-- Flyway Migration V022
-- 创建 IoT 协议表、数据管道表和数据点表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS iot_protocols (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  protocol_name VARCHAR(128) DEFAULT NULL,
  protocol_type VARCHAR(32) DEFAULT NULL,
  config JSON DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT协议';

CREATE TABLE IF NOT EXISTS iot_pipelines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  pipeline_name VARCHAR(128) DEFAULT NULL,
  source VARCHAR(128) DEFAULT NULL,
  target VARCHAR(128) DEFAULT NULL,
  config JSON DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT数据管道';

CREATE TABLE IF NOT EXISTS iot_data_points (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  point_name VARCHAR(128) DEFAULT NULL,
  device_id VARCHAR(64) DEFAULT NULL,
  data_type VARCHAR(32) DEFAULT NULL,
  unit VARCHAR(32) DEFAULT NULL,
  config JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_id (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT数据点';
