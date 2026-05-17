-- ============================================================
-- Flyway Migration V054 (MySQL 5.7 兼容版)
-- 数据库优化 v2.1 — 高频索引补充与统计信息更新
-- 源文件: app/sql/optimize_v2.sql
-- 说明: 原文件使用 ADD INDEX IF NOT EXISTS（MySQL 8.0+），
--       此版本使用存储过程动态检测，兼容 MySQL 5.7
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELIMITER $$

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

-- 1. 核心表高频查询索引补充
CALL SafeAddIndex('fire_host', 'idx_brand_status', 'brand, status');
CALL SafeAddIndex('fire_loop', 'idx_host_status', 'host_id, status');
CALL SafeAddIndex('fire_device', 'idx_host_loop_status', 'host_id, loop_no, status');
CALL SafeAddIndex('fscn8001_alarm', 'idx_type_time', 'alarm_type, alarm_time');
CALL SafeAddIndex('fscn8001_alarm', 'idx_status_time', 'status, alarm_time');
CALL SafeAddIndex('control_room_realtime', 'idx_room_id', 'room_id');
CALL SafeAddIndex('control_room_command_log', 'idx_type_time', 'command_type, command_time');
CALL SafeAddIndex('multiline_panel', 'idx_host_point', 'host_id, point_no');
CALL SafeAddIndex('bus_panel', 'idx_host_loop_point', 'host_id, loop_no, point_no');

-- 2. 覆盖索引优化
CALL SafeAddIndex('fire_device', 'idx_cover_list', 'host_id, loop_no, status, device_type, location, address');
CALL SafeAddIndex('fscn8001_alarm', 'idx_cover_list', 'device_sn, alarm_type, status, alarm_time, location, host_code');

-- 3. 统计信息更新
ANALYZE TABLE fire_host;
ANALYZE TABLE fire_loop;
ANALYZE TABLE fire_device;
ANALYZE TABLE fscn8001_alarm;
ANALYZE TABLE fscn8001_device;
ANALYZE TABLE control_room_realtime;
ANALYZE TABLE control_room_command_log;
ANALYZE TABLE multiline_panel;
ANALYZE TABLE bus_panel;
ANALYZE TABLE devices;
ANALYZE TABLE iot_devices;
ANALYZE TABLE cameras;
ANALYZE TABLE gb28181_devices;
ANALYZE TABLE users;

-- 4. 表结构优化（InnoDB 碎片整理）
OPTIMIZE TABLE fire_host;
OPTIMIZE TABLE fire_loop;
OPTIMIZE TABLE fire_device;
OPTIMIZE TABLE fscn8001_alarm;
OPTIMIZE TABLE fscn8001_device;

-- 清理存储过程
DROP PROCEDURE IF EXISTS SafeAddIndex;

SET FOREIGN_KEY_CHECKS = 1;
