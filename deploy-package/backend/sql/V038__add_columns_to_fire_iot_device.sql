-- ============================================================
-- Flyway Migration V038
-- 为 fire_iot_device 表扩展协议相关字段
-- 源文件: fix_iot.sql
-- ============================================================

ALTER TABLE fire_iot_device
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(30) NULL AFTER device_name,
  ADD COLUMN IF NOT EXISTS protocol_type VARCHAR(20) NULL AFTER device_type,
  ADD COLUMN IF NOT EXISTS protocol_config TEXT NULL AFTER protocol_type,
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50) NULL AFTER last_online,
  ADD COLUMN IF NOT EXISTS data_format VARCHAR(20) NULL AFTER port;
