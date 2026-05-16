-- ═══════════════════════════════════════════════════════════════════
-- 智慧消防平台 - MySQL 5.7 兼容数据库修复脚本
-- 执行前请备份数据库！
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────────────────────────
-- 辅助存储过程：安全添加字段（若不存在则添加）
-- ─────────────────────────────────────────────────────────────────
DELIMITER $$

DROP PROCEDURE IF EXISTS SafeAddColumn$$
CREATE PROCEDURE SafeAddColumn(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_def VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_column, ' ', p_def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
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
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD INDEX ', p_index, ' (', p_cols, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Added index ', p_index, ' on ', p_table) AS result;
  ELSE
    SELECT CONCAT('Index ', p_index, ' already exists on ', p_table) AS result;
  END IF;
END$$

DROP PROCEDURE IF EXISTS SafeAddUnique$$
CREATE PROCEDURE SafeAddUnique(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD UNIQUE INDEX ', p_index, ' (', p_cols, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Added unique index ', p_index, ' on ', p_table) AS result;
  ELSE
    SELECT CONCAT('Unique index ', p_index, ' already exists on ', p_table) AS result;
  END IF;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────────
-- 1. fire_unit 表修复
-- ─────────────────────────────────────────────────────────────────
CALL SafeAddColumn('fire_unit', 'contact_email', "VARCHAR(100) COMMENT '联系邮箱' AFTER contact_phone");
CALL SafeAddColumn('fire_unit', 'legal_person', "VARCHAR(50) COMMENT '法人' AFTER contact_email");
CALL SafeAddColumn('fire_unit', 'license_no', "VARCHAR(64) COMMENT '统一社会信用代码' AFTER legal_person");

CALL SafeAddIndex('fire_unit', 'idx_unit_code', 'unit_code');
CALL SafeAddIndex('fire_unit', 'idx_unit_type', 'unit_type');
CALL SafeAddIndex('fire_unit', 'idx_fire_level', 'fire_level');

-- ─────────────────────────────────────────────────────────────────
-- 2. fire_device 表修复
-- ─────────────────────────────────────────────────────────────────
CALL SafeAddColumn('fire_device', 'remark', "TEXT COMMENT '备注' AFTER point_id");
CALL SafeAddColumn('fire_device', 'config', "TEXT COMMENT '扩展配置JSON' AFTER remark");
CALL SafeAddColumn('fire_device', 'online_status', "TINYINT DEFAULT 0 COMMENT '在线状态：0离线 1在线' AFTER config");
CALL SafeAddColumn('fire_device', 'calibration_cycle', "INT COMMENT '校准周期(月)' AFTER online_status");
CALL SafeAddColumn('fire_device', 'scrap_year', "INT COMMENT '报废年限(年)' AFTER calibration_cycle");
CALL SafeAddColumn('fire_device', 'gateway_id', "VARCHAR(100) COMMENT '传输装置ID' AFTER scrap_year");

CALL SafeAddUnique('fire_device', 'device_no', 'device_no');
CALL SafeAddIndex('fire_device', 'idx_device_sn', 'device_sn');
CALL SafeAddIndex('fire_device', 'idx_lifecycle_status', 'lifecycle_status');

-- ─────────────────────────────────────────────────────────────────
-- 3. 其他高频表索引优化
-- ─────────────────────────────────────────────────────────────────
CALL SafeAddIndex('fire_alarm', 'idx_created_at', 'created_at');
CALL SafeAddIndex('fire_control_room', 'idx_cr_unit_id', 'unit_id');
CALL SafeAddIndex('fire_iot_device', 'idx_iot_unit_id', 'unit_id');

-- ─────────────────────────────────────────────────────────────────
-- 4. 数据一致性修复
-- ─────────────────────────────────────────────────────────────────
UPDATE fire_device SET lifecycle_status = 1 WHERE lifecycle_status IS NULL;
UPDATE fire_device SET status = 1 WHERE status IS NULL;
UPDATE fire_unit SET unit_type = 1 WHERE unit_type IS NULL;
UPDATE fire_unit SET fire_level = 1 WHERE fire_level IS NULL;

-- ─────────────────────────────────────────────────────────────────
-- 5. 清理存储过程
-- ─────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS SafeAddColumn;
DROP PROCEDURE IF EXISTS SafeAddIndex;
DROP PROCEDURE IF EXISTS SafeAddUnique;

SET FOREIGN_KEY_CHECKS = 1;
