-- ═══════════════════════════════════════════════════════════════════
-- Flyway Migration V047
-- ISNB 协议集成：IoT 遥测数据表（用于历史曲线和设备状态追踪）
-- 来源：backend/sql/deploy_isnb_20260515.sql 拆分
-- 依赖：无（独立表）
-- 幂等性：CREATE TABLE IF NOT EXISTS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS iot_telemetry (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  iot_device_id BIGINT NOT NULL,
  message_id INT DEFAULT NULL,
  message_type VARCHAR(32) DEFAULT NULL,
  dev_type INT DEFAULT NULL,
  dev_type_name VARCHAR(64) DEFAULT NULL,
  imei VARCHAR(32) DEFAULT NULL,
  device_model VARCHAR(64) DEFAULT NULL,
  rsrp INT DEFAULT NULL,
  snr INT DEFAULT NULL,
  shield INT DEFAULT NULL,
  channel_count INT DEFAULT NULL,
  pressure_kpa DECIMAL(10,2) DEFAULT NULL,
  level_m DECIMAL(10,2) DEFAULT NULL,
  temperature DECIMAL(10,1) DEFAULT NULL,
  battery_pct INT DEFAULT NULL,
  has_alarm TINYINT DEFAULT 0,
  has_fault TINYINT DEFAULT 0,
  raw_hex TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_iot_device_id (iot_device_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT遥测数据';
