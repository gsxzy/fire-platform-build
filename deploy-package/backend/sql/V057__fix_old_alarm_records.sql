-- ============================================================
-- Flyway Migration V057
-- 修复历史告警记录单位信息
-- 源文件: backend/sql/fix_old_alarms.sql
-- ============================================================

UPDATE fire_platform.fire_alarm
SET device_id=1323, unit_id=32, unit_name='甘肃赋安'
WHERE id BETWEEN 3877 AND 3881;
