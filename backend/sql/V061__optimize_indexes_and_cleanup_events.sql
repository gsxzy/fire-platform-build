-- ============================================================
-- Flyway Migration V061
-- 数据库性能优化 v3.0 — 索引补充、冗余清理、日志 TTL 事件
-- 兼容 MySQL 5.7 + 8.0（使用存储过程安全添加）
-- 执行时机: 任意时间，可重复执行（所有操作均为 IF NOT EXISTS）
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
  END IF;
END$$

DROP PROCEDURE IF EXISTS SafeAddUnique$$
CREATE PROCEDURE SafeAddUnique(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD UNIQUE INDEX ', p_index, ' (', p_cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Added unique index ', p_index, ' on ', p_table) AS result;
  END IF;
END$$

DROP PROCEDURE IF EXISTS SafeDropIndex$$
CREATE PROCEDURE SafeDropIndex(IN p_table VARCHAR(64), IN p_index VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' DROP INDEX ', p_index);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Dropped index ', p_index, ' from ', p_table) AS result;
  END IF;
END$$

DELIMITER ;

-- ============================================================
-- 1. 清理冗余索引（避免浪费空间和写入性能）
-- ============================================================

-- fire_device: idx_lifecycle_status 已被 idx_lifecycle_created 最左前缀覆盖
CALL SafeDropIndex('fire_device', 'idx_lifecycle_status');

-- fire_device: idx_device_no 与 device_no 的 UNIQUE 约束自动创建的索引重复
-- （保留 unique 约束自动索引，删除额外普通索引）
-- 注意：如果之前未创建 unique 约束，此操作需谨慎；当前模型已声明 unique
CALL SafeDropIndex('fire_device', 'idx_device_no');

-- ============================================================
-- 2. 核心缺失索引（P0）
-- ============================================================

-- fire_alarm: 告警列表高频查询 WHERE status=0 ORDER BY created_at DESC
CALL SafeAddIndex('fire_alarm', 'idx_alarm_status_created', 'status, created_at');

-- fire_alarm: 告警趋势统计 GROUP BY alarm_type + created_at
CALL SafeAddIndex('fire_alarm', 'idx_alarm_type_created', 'alarm_type, created_at');

-- fire_iot_device: archive_device_id 模型声明 unique 但未建索引
CALL SafeAddUnique('fire_iot_device', 'uk_archive_device_id', 'archive_device_id');

-- fire_iot_device: device_sn 高频精确查询（CTWing 推送、IoT 列表）
CALL SafeAddIndex('fire_iot_device', 'idx_device_sn', 'device_sn');

-- ============================================================
-- 3. 高频关联查询索引（P1）
-- ============================================================

-- fire_device: 按名称搜索（keyword LIKE '%x%' 走 Index Full Scan 优于 Table Full Scan）
CALL SafeAddIndex('fire_device', 'idx_device_name', 'device_name');

-- fire_unit: 按单位名称搜索
CALL SafeAddIndex('fire_unit', 'idx_unit_name', 'unit_name');

-- fire_control_room: 按 unit_id 查询（消控室详情、报警关联）
CALL SafeAddIndex('fire_control_room', 'idx_unit_id', 'unit_id');

-- fire_control_room_host: 按 room_id 关联查询
CALL SafeAddIndex('fire_control_room_host', 'idx_room_id', 'room_id');

-- fire_maint_work_order: 组合查询（status, order_type, created_at）
CALL SafeAddIndex('fire_maint_work_order', 'idx_status_type_created', 'status, order_type, created_at');

-- fire_patrol_record: 时间范围查询（Dashboard 今日统计）
CALL SafeAddIndex('fire_patrol_record', 'idx_created_at', 'created_at');

-- sys_log: 用户+时间范围查询
CALL SafeAddIndex('sys_log', 'idx_user_created', 'user_id, created_at');

-- ctwing_raw_log: 设备+时间范围（遥测历史查询）
CALL SafeAddIndex('ctwing_raw_log', 'idx_device_created', 'device_id, created_at');

-- iot_telemetry: 设备+时间范围（历史曲线查询）
CALL SafeAddIndex('iot_telemetry', 'idx_iot_device_created', 'iot_device_id, created_at');

-- fire_host_command_log: 按 room_id 查询
CALL SafeAddIndex('fire_host_command_log', 'idx_room_id', 'room_id');

-- ============================================================
-- 4. 日志 TTL 自动清理事件（P1）
-- ============================================================

SET GLOBAL event_scheduler = ON;

-- CTWing 原始日志（高频写入，保留 90 天）
DROP EVENT IF EXISTS evt_cleanup_ctwing_raw_log;
CREATE EVENT evt_cleanup_ctwing_raw_log
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM ctwing_raw_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
ALTER EVENT evt_cleanup_ctwing_raw_log ENABLE;

-- IoT 遥测数据（历史曲线保留 180 天）
DROP EVENT IF EXISTS evt_cleanup_iot_telemetry;
CREATE EVENT evt_cleanup_iot_telemetry
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM iot_telemetry WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY);
ALTER EVENT evt_cleanup_iot_telemetry ENABLE;

-- 系统日志（保留 90 天）
DROP EVENT IF EXISTS evt_cleanup_sys_log;
CREATE EVENT evt_cleanup_sys_log
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM sys_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
ALTER EVENT evt_cleanup_sys_log ENABLE;

-- 消控室指令日志（保留 365 天）
DROP EVENT IF EXISTS evt_cleanup_host_command_log;
CREATE EVENT evt_cleanup_host_command_log
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM fire_host_command_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);
ALTER EVENT evt_cleanup_host_command_log ENABLE;

-- ============================================================
-- 5. 统计信息更新（帮助优化器选择正确执行计划）
-- ============================================================

ANALYZE TABLE fire_alarm;
ANALYZE TABLE fire_device;
ANALYZE TABLE fire_iot_device;
ANALYZE TABLE fire_unit;
ANALYZE TABLE ctwing_raw_log;
ANALYZE TABLE iot_telemetry;

-- 清理临时存储过程
DROP PROCEDURE IF EXISTS SafeAddIndex;
DROP PROCEDURE IF EXISTS SafeAddUnique;
DROP PROCEDURE IF EXISTS SafeDropIndex;

SET FOREIGN_KEY_CHECKS = 1;
