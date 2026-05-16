-- ============================================================
-- Flyway Migration V053 (MySQL 5.7 兼容版)
-- 生产环境索引优化、日志 TTL 事件与字符集统一
-- 源文件: app/sql/optimize_production.sql
-- 说明: 原文件使用 ADD COLUMN IF NOT EXISTS / ADD INDEX IF NOT EXISTS
--       （MySQL 8.0+），此版本使用存储过程动态检测，兼容 MySQL 5.7
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS SafeAddColumn$$
CREATE PROCEDURE SafeAddColumn(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_def VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_column, ' ', p_def);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Added ', p_column, ' to ', p_table) AS result;
  ELSE
    SELECT CONCAT(p_column, ' already exists in ', p_table) AS result;
  END IF;
END$$

DROP PROCEDURE IF EXISTS SafeAddIndex$$
CREATE PROCEDURE SafeAddIndex(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD INDEX ', p_index, ' (', p_cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Added index ', p_index, ' on ', p_table) AS result;
  ELSE
    SELECT CONCAT('Index ', p_index, ' already exists on ', p_table) AS result;
  END IF;
END$$

DELIMITER ;

-- 1. 用户表密码安全加固字段
CALL SafeAddColumn('users', 'password_hash', "VARCHAR(256) DEFAULT NULL COMMENT '密码哈希值'");
CALL SafeAddColumn('users', 'salt', "VARCHAR(64) DEFAULT NULL COMMENT '密码盐值'");

-- MODIFY COLUMN 在 MySQL 5.7 中兼容
ALTER TABLE users MODIFY COLUMN password VARCHAR(128) NOT NULL COMMENT '【已废弃】原密码字段';

-- 2. 缺失索引补充
CALL SafeAddIndex('iot_sensor_data', 'idx_record_time', 'record_time');
CALL SafeAddIndex('control_room_command_log', 'idx_host_command_time', 'host_id, command_time');
CALL SafeAddIndex('control_command_log', 'idx_host_created', 'host_id, created_at');
CALL SafeAddIndex('fscn8001_raw_log', 'idx_device_sn', 'device_sn');
CALL SafeAddIndex('fscn8001_raw_log', 'idx_created_at', 'created_at');
CALL SafeAddIndex('feedback_record', 'idx_host_feedback', 'host_id, feedback_type');
CALL SafeAddIndex('users', 'idx_phone', 'phone');
CALL SafeAddIndex('users', 'idx_email', 'email');
CALL SafeAddIndex('fscn8001_alarm', 'idx_alarm_time', 'alarm_time');
CALL SafeAddIndex('fscn8001_alarm', 'idx_device_sn', 'device_sn');

-- 3. 开启事件调度器（MySQL 5.7 兼容，需 SUPER 权限）
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

-- 清理存储过程
DROP PROCEDURE IF EXISTS SafeAddColumn;
DROP PROCEDURE IF EXISTS SafeAddIndex;

SET FOREIGN_KEY_CHECKS = 1;
