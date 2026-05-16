-- ============================================================
-- Flyway Migration V052 (MySQL 5.7 兼容版)
-- 商用交付外键约束与高频索引补充
-- 源文件: app/sql/commercial_delivery.sql
-- 说明: 原文件使用 ADD CONSTRAINT IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
--       （MySQL 8.0+），此版本使用存储过程动态检测，兼容 MySQL 5.7
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS SafeAddForeignKey$$
CREATE PROCEDURE SafeAddForeignKey(IN p_table VARCHAR(64), IN p_constraint VARCHAR(64), IN p_cols VARCHAR(255), IN p_ref_table VARCHAR(64), IN p_ref_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND CONSTRAINT_NAME = p_constraint
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD CONSTRAINT ', p_constraint, ' FOREIGN KEY (', p_cols, ') REFERENCES ', p_ref_table, ' (', p_ref_cols, ') ON DELETE SET NULL ON UPDATE CASCADE');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Added FK ', p_constraint, ' on ', p_table) AS result;
  ELSE
    SELECT CONCAT('FK ', p_constraint, ' already exists on ', p_table) AS result;
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

-- 设备档案表外键约束
CALL SafeAddForeignKey('devices', 'fk_devices_unit_id', 'unit_id', 'units', 'id');
CALL SafeAddForeignKey('iot_devices', 'fk_iot_devices_unit_id', 'unit_id', 'units', 'id');
CALL SafeAddForeignKey('cameras', 'fk_cameras_unit_id', 'unit_id', 'units', 'id');
CALL SafeAddForeignKey('gb28181_devices', 'fk_gb28181_devices_unit_id', 'unit_id', 'units', 'id');

-- 高频查询索引补充
CALL SafeAddIndex('alarms', 'idx_alarms_status_type', 'status, type');
CALL SafeAddIndex('alarms', 'idx_alarms_created_at', 'created_at');
CALL SafeAddIndex('alarms', 'idx_alarms_unit_id', 'unit_id');
CALL SafeAddIndex('work_orders', 'idx_work_orders_status', 'status');
CALL SafeAddIndex('work_orders', 'idx_work_orders_created_at', 'created_at');
CALL SafeAddIndex('patrol_records', 'idx_patrol_records_plan_id', 'plan_id');
CALL SafeAddIndex('patrol_records', 'idx_patrol_records_status', 'status');
CALL SafeAddIndex('hazards', 'idx_hazards_status', 'status');
CALL SafeAddIndex('hazards', 'idx_hazards_level', 'level');
CALL SafeAddIndex('control_room_realtime', 'idx_control_room_host_id', 'host_id');
CALL SafeAddIndex('feedback_record', 'idx_feedback_host_point', 'host_id, loop_no, point_no');
CALL SafeAddIndex('control_command_log', 'idx_command_log_host', 'host_id, created_at');

-- 统一字符集
ALTER DATABASE fire_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 清理存储过程
DROP PROCEDURE IF EXISTS SafeAddForeignKey;
DROP PROCEDURE IF EXISTS SafeAddIndex;

SET FOREIGN_KEY_CHECKS = 1;
