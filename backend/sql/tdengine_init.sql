-- ═══════════════════════════════════════════════════════════════
-- TDengine 时序数据库初始化脚本
-- 适用于 TDengine 3.0+
-- 执行方式：
--   taos -s "source tdengine_init.sql"
-- 或 REST API:
--   curl -u root:taosdata http://localhost:6041/rest/sql/ \
--     -d "CREATE DATABASE IF NOT EXISTS fire_platform_ts;"
-- ═══════════════════════════════════════════════════════════════

-- 创建数据库
CREATE DATABASE IF NOT EXISTS fire_platform_ts;

USE fire_platform_ts;

-- 超级表 1：传感器遥测数据（水压、液位、温度、电量等）
CREATE STABLE IF NOT EXISTS stb_telemetry (
  ts TIMESTAMP,
  message_id INT,
  message_type NCHAR(32),
  dev_type INT,
  dev_type_name NCHAR(64),
  imei NCHAR(32),
  device_model NCHAR(64),
  rsrp INT,
  snr INT,
  shield INT,
  channel_count INT,
  pressure_kpa DOUBLE,
  level_m DOUBLE,
  temperature DOUBLE,
  battery_pct INT,
  has_alarm BOOL,
  has_fault BOOL,
  raw_hex NCHAR(4000)
) TAGS (
  iot_device_id BIGINT,
  device_sn NCHAR(100)
);

-- 超级表 2：协议原始报文日志（GB26875 / FSCN8001 / CTWing / Hikvision4G）
CREATE STABLE IF NOT EXISTS stb_raw_log (
  ts TIMESTAMP,
  direction NCHAR(8),
  cmd_type NCHAR(16),
  hex_data NCHAR(8000),
  raw_json NCHAR(4000)
) TAGS (
  protocol_type NCHAR(20),
  device_id NCHAR(100)
);
