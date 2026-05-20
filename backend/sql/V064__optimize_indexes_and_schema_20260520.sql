-- ═══════════════════════════════════════════════════════════════
-- V064: 数据库性能优化与 Schema 一致性修复
-- 日期: 2026-05-20
-- 作者: AI Agent
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. 设备管理复合索引优化
-- ───────────────────────────────────────────────────────────────

-- 单位维度设备查询（设备配置页面高频）
DROP PROCEDURE IF EXISTS SafeAddIndex;
DELIMITER $$
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

-- fire_device 表索引优化
CALL SafeAddIndex('fire_device', 'idx_unit_status', 'unit_id, status');
CALL SafeAddIndex('fire_device', 'idx_unit_lifecycle', 'unit_id, lifecycle_status');
CALL SafeAddIndex('fire_device', 'idx_type_status', 'device_type, status');
CALL SafeAddIndex('fire_device', 'idx_online_status', 'online_status, updated_at');

-- fire_alarm 表索引优化
CALL SafeAddIndex('fire_alarm', 'idx_status_created', 'status, created_at');
CALL SafeAddIndex('fire_alarm', 'idx_unit_status', 'unit_id, status');
CALL SafeAddIndex('fire_alarm', 'idx_handler_status', 'handler_id, status');

-- fire_iot_device 表索引优化
CALL SafeAddIndex('fire_iot_device', 'idx_protocol_status', 'protocol_type, status');
CALL SafeAddIndex('fire_iot_device', 'idx_last_online', 'last_online');

-- fire_dispatch_record 表索引优化
CALL SafeAddIndex('dispatch_record', 'idx_alarm_phase', 'alarm_id, phase');
CALL SafeAddIndex('dispatch_record', 'idx_status_due', 'status, due_time');

-- fire_patrol_record 表索引优化
CALL SafeAddIndex('fire_patrol_record', 'idx_unit_date', 'unit_id, patrol_date');

-- fire_maint_work_order 表索引优化
CALL SafeAddIndex('fire_maint_work_order', 'idx_unit_status', 'unit_id, status');
CALL SafeAddIndex('fire_maint_work_order', 'idx_assignee_status', 'assignee_id, status');

-- sys_log 表索引优化
CALL SafeAddIndex('sys_log', 'idx_user_created', 'user_id, created_at');
CALL SafeAddIndex('sys_log', 'idx_operation_created', 'operation, created_at');

-- iot_telemetry 表分区准备索引
CALL SafeAddIndex('iot_telemetry', 'idx_iot_created', 'iot_device_id, created_at');

DROP PROCEDURE IF EXISTS SafeAddIndex;

-- ───────────────────────────────────────────────────────────────
-- 2. fire_device 表 online_status 字段一致性修正
--    确保 online_status 有默认值 0（离线）
-- ───────────────────────────────────────────────────────────────
ALTER TABLE fire_device
  MODIFY COLUMN online_status TINYINT NOT NULL DEFAULT 0 COMMENT '在线状态: 0离线 1在线 2故障'
  AFTER status;

-- ───────────────────────────────────────────────────────────────
-- 3. fire_alarm 表索引冗余清理评估注释
--    注意：idx_status、idx_alarm_type、idx_alarm_level 为单列索引
--    idx_alarm_type_status_time 复合索引已覆盖常用查询，
--    但保留单列索引以支持单独条件查询，暂不删除。
-- ───────────────────────────────────────────────────────────────

-- ───────────────────────────────────────────────────────────────
-- 4. JSON 字段类型统一
--    fire_device.protocol_config 和 fire_iot_device.protocol_config
--    建议从 TEXT 迁移到 JSON 类型以支持原生查询与索引
-- ───────────────────────────────────────────────────────────────
-- 步骤1：清理无效的 JSON 数据（避免 ALTER 时报错）
UPDATE fire_device SET protocol_config = NULL
WHERE protocol_config IS NOT NULL AND protocol_config != '' AND JSON_VALID(protocol_config) = 0;
UPDATE fire_iot_device SET protocol_config = NULL
WHERE protocol_config IS NOT NULL AND protocol_config != '' AND JSON_VALID(protocol_config) = 0;

-- 步骤2：将 TEXT 字段改为 JSON 类型
ALTER TABLE fire_device
  MODIFY COLUMN protocol_config JSON DEFAULT NULL COMMENT '协议配置(JSON)';
ALTER TABLE fire_iot_device
  MODIFY COLUMN protocol_config JSON DEFAULT NULL COMMENT '协议配置(JSON)';

-- ───────────────────────────────────────────────────────────────
-- 5. fire_device 表 remark/config 字段扩展
-- ───────────────────────────────────────────────────────────────
ALTER TABLE fire_device
  MODIFY COLUMN remark TEXT DEFAULT NULL COMMENT '备注',
  MODIFY COLUMN config JSON DEFAULT NULL COMMENT '设备配置(JSON)';
