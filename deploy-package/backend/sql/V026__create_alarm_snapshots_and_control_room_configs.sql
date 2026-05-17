-- ============================================================
-- Flyway Migration V026
-- 创建报警快照表、消控室配置表和楼层设备表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS alarm_snapshots (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  alarm_id BIGINT DEFAULT NULL,
  image_url VARCHAR(512) DEFAULT NULL,
  video_url VARCHAR(512) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alarm_id (alarm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报警快照';

CREATE TABLE IF NOT EXISTS control_room_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  unit_id VARCHAR(64) DEFAULT NULL,
  room_name VARCHAR(128) DEFAULT NULL,
  location VARCHAR(256) DEFAULT NULL,
  cameras JSON DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消控室配置';

CREATE TABLE IF NOT EXISTS floor_devices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  floor_plan_id BIGINT DEFAULT NULL,
  device_id VARCHAR(64) DEFAULT NULL,
  x DECIMAL(10,2) DEFAULT 0,
  y DECIMAL(10,2) DEFAULT 0,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_floor_plan_id (floor_plan_id),
  INDEX idx_device_id (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='楼层设备';
