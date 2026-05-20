-- ============================================================
-- Flyway Migration V045 (MySQL 5.7 Compatible)
-- 生产环境 schema 修复 — fire_unit / fire_device 字段补齐
-- 源文件: backend/sql/fix_production_schema.sql
-- ============================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS SafeAddColumn$$
CREATE PROCEDURE SafeAddColumn(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_def VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_col, ' ', p_def);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
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
  END IF;
END$$

DELIMITER ;

-- fire_unit：添加缺失字段及索引
CALL SafeAddColumn('fire_unit', 'contact_email', 'VARCHAR(128) NULL COMMENT "联系邮箱"');
CALL SafeAddColumn('fire_unit', 'legal_person', 'VARCHAR(64) NULL COMMENT "法人"');
CALL SafeAddColumn('fire_unit', 'license_no', 'VARCHAR(64) NULL COMMENT "许可证号"');

CALL SafeAddIndex('fire_unit', 'idx_contact_email', 'contact_email');
CALL SafeAddIndex('fire_unit', 'idx_legal_person', 'legal_person');
CALL SafeAddIndex('fire_unit', 'idx_license_no', 'license_no');

-- fire_device：添加缺失字段及索引
CALL SafeAddColumn('fire_device', 'remark', 'VARCHAR(512) NULL COMMENT "备注"');
CALL SafeAddColumn('fire_device', 'config', 'JSON NULL COMMENT "设备配置"');
CALL SafeAddColumn('fire_device', 'online_status', 'TINYINT DEFAULT 0 COMMENT "在线状态：0离线 1在线 2故障"');
CALL SafeAddColumn('fire_device', 'calibration_cycle', 'INT DEFAULT 12 COMMENT "检定周期（月）"');
CALL SafeAddColumn('fire_device', 'scrap_year', 'INT DEFAULT NULL COMMENT "报废年限"');
CALL SafeAddColumn('fire_device', 'gateway_id', 'VARCHAR(64) NULL COMMENT "网关ID"');

CALL SafeAddIndex('fire_device', 'idx_remark', 'remark(100)');
CALL SafeAddIndex('fire_device', 'idx_online_status', 'online_status');
CALL SafeAddIndex('fire_device', 'idx_calibration_cycle', 'calibration_cycle');
CALL SafeAddIndex('fire_device', 'idx_scrap_year', 'scrap_year');
CALL SafeAddIndex('fire_device', 'idx_gateway_id', 'gateway_id');

-- 修复 NULL 值导致的查询异常
UPDATE fire_device SET lifecycle_status = 1 WHERE lifecycle_status IS NULL;
UPDATE fire_device SET status = 1 WHERE status IS NULL;
UPDATE fire_unit SET unit_type = 'commercial' WHERE unit_type IS NULL;
UPDATE fire_unit SET fire_level = '一般' WHERE fire_level IS NULL;

DROP PROCEDURE IF EXISTS SafeAddColumn;
DROP PROCEDURE IF EXISTS SafeAddIndex;
