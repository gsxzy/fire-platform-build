-- ============================================================
-- Flyway Migration V044 (MySQL 5.7 Compatible)
-- 商业环境高频查询索引补充
-- 源文件: backend/sql/commercial_indexes.sql
-- ============================================================

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
  END IF;
END$$

DELIMITER ;

-- 1. 告警中心 (fire_alarm)
CALL SafeAddIndex('fire_alarm', 'idx_fire_alarm_device_id', 'device_id');
CALL SafeAddIndex('fire_alarm', 'idx_fire_alarm_unit_id', 'unit_id');
CALL SafeAddIndex('fire_alarm', 'idx_fire_alarm_status', 'status');
CALL SafeAddIndex('fire_alarm', 'idx_fire_alarm_alarm_type', 'alarm_type');
CALL SafeAddIndex('fire_alarm', 'idx_fire_alarm_alarm_level', 'alarm_level');
CALL SafeAddIndex('fire_alarm', 'idx_fire_alarm_created_at', 'created_at');

-- 2. 设备管理 (fire_device)
CALL SafeAddIndex('fire_device', 'idx_fire_device_unit_id', 'unit_id');
CALL SafeAddIndex('fire_device', 'idx_fire_device_device_type', 'device_type');
CALL SafeAddIndex('fire_device', 'idx_fire_device_status', 'status');
CALL SafeAddIndex('fire_device', 'idx_fire_device_building_id', 'building_id');
CALL SafeAddIndex('fire_device', 'idx_fire_device_floor_id', 'floor_id');

-- 3. IoT 设备接入 (fire_iot_device)
CALL SafeAddIndex('fire_iot_device', 'idx_fire_iot_device_unit_id', 'unit_id');
CALL SafeAddIndex('fire_iot_device', 'idx_fire_iot_device_protocol_type', 'protocol_type');

-- 4. 巡检管理
CALL SafeAddIndex('fire_patrol_record', 'idx_fire_patrol_record_plan_id', 'plan_id');
CALL SafeAddIndex('fire_patrol_record', 'idx_fire_patrol_record_unit_id', 'unit_id');
CALL SafeAddIndex('fire_hazard', 'idx_fire_hazard_unit_id', 'unit_id');
CALL SafeAddIndex('fire_hazard', 'idx_fire_hazard_status', 'status');

-- 5. 维保工单
CALL SafeAddIndex('fire_maint_work_order', 'idx_fire_maint_work_order_device_id', 'device_id');
CALL SafeAddIndex('fire_maint_work_order', 'idx_fire_maint_work_order_unit_id', 'unit_id');
CALL SafeAddIndex('fire_maint_work_order', 'idx_fire_maint_work_order_status', 'status');

-- 6. 设备控制指令
CALL SafeAddIndex('fire_control_command', 'idx_fire_control_command_device_id', 'device_id');
CALL SafeAddIndex('fire_control_command', 'idx_fire_control_command_status', 'status');

-- 7. 值班排班
CALL SafeAddIndex('fire_duty_schedule', 'idx_fire_duty_schedule_user_id', 'user_id');
CALL SafeAddIndex('fire_duty_schedule', 'idx_fire_duty_schedule_duty_date', 'duty_date');

-- 8. 系统日志
CALL SafeAddIndex('sys_log', 'idx_sys_log_user_id', 'user_id');
CALL SafeAddIndex('sys_log', 'idx_sys_log_created_at', 'created_at');

-- 9. 用户权限
CALL SafeAddIndex('sys_user', 'idx_sys_user_dept_id', 'dept_id');
CALL SafeAddIndex('sys_user', 'idx_sys_user_status', 'status');
CALL SafeAddIndex('sys_permission', 'idx_sys_permission_parent_id', 'parent_id');
CALL SafeAddIndex('sys_permission', 'idx_sys_permission_type', 'type');

-- 唯一索引需单独处理
DELIMITER $$
DROP PROCEDURE IF EXISTS SafeAddUniqueIndex$$
CREATE PROCEDURE SafeAddUniqueIndex(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD UNIQUE INDEX ', p_index, ' (', p_cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL SafeAddUniqueIndex('sys_user_role', 'uk_sys_user_role', 'user_id, role_id');
CALL SafeAddUniqueIndex('sys_role_permission', 'uk_sys_role_permission', 'role_id, perm_id');

-- 10. 单位管理
CALL SafeAddIndex('fire_unit', 'idx_fire_unit_unit_type', 'unit_type');
CALL SafeAddIndex('fire_unit', 'idx_fire_unit_status', 'status');

-- 11. 消控室
CALL SafeAddIndex('fire_control_room', 'idx_fire_control_room_unit_id', 'unit_id');
CALL SafeAddIndex('fire_control_room_host', 'idx_fire_control_room_host_room_id', 'room_id');
CALL SafeAddIndex('fire_multiline_panel', 'idx_fire_multiline_panel_host_id', 'host_id');
CALL SafeAddIndex('fire_bus_point', 'idx_fire_bus_point_host_id', 'host_id');
CALL SafeAddIndex('fire_host_command_log', 'idx_fire_host_command_log_room_id', 'room_id');
CALL SafeAddIndex('fire_host_command_log', 'idx_fire_host_command_log_host_id', 'host_id');

-- 12. 建筑楼层
CALL SafeAddIndex('buildings', 'idx_buildings_unit_id', 'unit_id');
CALL SafeAddIndex('floors', 'idx_floors_building_id', 'building_id');
CALL SafeAddIndex('floor_camera_bindings', 'idx_floor_camera_bindings_floor_id', 'floor_id');

DROP PROCEDURE IF EXISTS SafeAddIndex;
DROP PROCEDURE IF EXISTS SafeAddUniqueIndex;
