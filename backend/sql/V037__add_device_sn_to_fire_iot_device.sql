-- ============================================================
-- Flyway Migration V037
-- 为 fire_iot_device 表添加 device_sn 字段
-- 源文件: fix_db.sql
-- ============================================================

ALTER TABLE fire_iot_device
  ADD COLUMN IF NOT EXISTS device_sn VARCHAR(100) NULL AFTER id,
  ADD UNIQUE INDEX IF NOT EXISTS uk_device_sn (device_sn);
