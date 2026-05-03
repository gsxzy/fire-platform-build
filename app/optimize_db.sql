-- ============================================================
-- 数据库优化脚本 - fire_platform
-- ============================================================

-- 1. 为 fscn8001_raw_log 添加时间索引（加速查询和清理）
ALTER TABLE fscn8001_raw_log ADD INDEX idx_created_at (created_at);
ALTER TABLE fscn8001_raw_log ADD INDEX idx_device_sn_created (device_sn, created_at);

-- 2. 为 gb26875_raw_log 添加时间索引
ALTER TABLE gb26875_raw_log ADD INDEX idx_created_at (created_at);
ALTER TABLE gb26875_raw_log ADD INDEX idx_device_id_created (device_id, created_at);

-- 3. 为 fscn8001_alarm 添加复合索引
ALTER TABLE fscn8001_alarm ADD INDEX idx_status_alarm_time (status, alarm_time);
ALTER TABLE fscn8001_alarm ADD INDEX idx_device_sn_alarm_time (device_sn, alarm_time);

-- 4. 清理 7 天前的 raw_log（保留最近 7 天用于调试）
DELETE FROM fscn8001_raw_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
DELETE FROM gb26875_raw_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 5. 优化表（回收空间）
OPTIMIZE TABLE fscn8001_raw_log;
OPTIMIZE TABLE gb26875_raw_log;
OPTIMIZE TABLE fscn8001_alarm;
