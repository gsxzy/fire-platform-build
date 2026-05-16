-- ============================================================
-- Flyway Migration V023
-- 创建控制命令模板表和地图相关表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS control_templates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_name VARCHAR(128) DEFAULT NULL,
  template_type VARCHAR(32) DEFAULT NULL,
  config JSON DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='控制模板';

CREATE TABLE IF NOT EXISTS map_markers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) DEFAULT NULL,
  type VARCHAR(32) DEFAULT NULL,
  lng DECIMAL(10,7) DEFAULT NULL,
  lat DECIMAL(10,7) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  device_id VARCHAR(64) DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地图标记';

CREATE TABLE IF NOT EXISTS map_layers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  layer_name VARCHAR(128) DEFAULT NULL,
  layer_type VARCHAR(32) DEFAULT NULL,
  config JSON DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地图图层';

CREATE TABLE IF NOT EXISTS map_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  config_name VARCHAR(128) DEFAULT NULL,
  config JSON DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地图配置';
