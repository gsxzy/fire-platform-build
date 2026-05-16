-- ============================================================
-- Flyway Migration V053
-- 生产环境索引优化、日志 TTL 事件与字符集统一
-- 源文件: app/sql/optimize_production.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 用户表密码安全加固字段
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(256) DEFAULT NULL COMMENT '密码哈希值',
  ADD COLUMN IF NOT EXISTS salt VARCHAR(64) DEFAULT NULL COMMENT '密码盐值',
  MODIFY COLUMN password VARCHAR(128) NOT NULL COMMENT '【已废弃】原密码字段';

-- 2. 缺失索引补充
ALTER TABLE iot_sensor_data ADD INDEX IF NOT EXISTS idx_record_time (record_time);
ALTER TABLE control_room_command_log ADD INDEX IF NOT EXISTS idx_host_command_time (host_id, command_time);
ALTER TABLE control_command_log ADD INDEX IF NOT EXISTS idx_host_created (host_id, created_at);
ALTER TABLE fscn8001_raw_log ADD INDEX IF NOT EXISTS idx_device_sn (device_sn);
ALTER TABLE fscn8001_raw_log ADD INDEX IF NOT EXISTS idx_created_at (created_at);
ALTER TABLE feedback_record ADD INDEX IF NOT EXISTS idx_host_feedback (host_id, feedback_type);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_phone (phone);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_email (email);
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_alarm_time (alarm_time);
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_device_sn (device_sn);

-- 3. 开启事件调度器
SET GLOBAL event_scheduler = ON;

-- 4. 日志 TTL 自动清理事件
DROP EVENT IF EXISTS evt_cleanup_fscn8001_raw_log;
CREATE EVENT evt_cleanup_fscn8001_raw_log
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM fscn8001_raw_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
ALTER EVENT evt_cleanup_fscn8001_raw_log ENABLE;

DROP EVENT IF EXISTS evt_cleanup_control_command_log;
CREATE EVENT evt_cleanup_control_command_log
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM control_command_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);
ALTER EVENT evt_cleanup_control_command_log ENABLE;

DROP EVENT IF EXISTS evt_cleanup_gb26875_raw_log;
CREATE EVENT evt_cleanup_gb26875_raw_log
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM gb26875_raw_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
ALTER EVENT evt_cleanup_gb26875_raw_log ENABLE;

-- 5. 关键表字符集统一
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fire_host CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fire_loop CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fire_device CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE iot_sensor CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE iot_sensor_data CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_command_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_room_command_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_room_realtime CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_room_shield CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_room_video CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE multiline_panel CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bus_panel CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE shield_record CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE feedback_record CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE host_multiline CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE host_bus_point CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE gb26875_raw_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE gb26875_device CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE gb26875_alarm CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fscn8001_raw_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fscn8001_alarm CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fscn8001_device CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
