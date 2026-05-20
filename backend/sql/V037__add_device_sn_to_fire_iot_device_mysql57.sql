-- ============================================================
-- Flyway Migration V037 (MySQL 5.7 Compatible)
-- 为 fire_iot_device 表添加 device_sn 字段
-- 源文件: fix_db.sql
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

CALL SafeAddColumn('fire_iot_device', 'device_sn', 'VARCHAR(100) NULL AFTER id');
CALL SafeAddIndex('fire_iot_device', 'uk_device_sn', 'device_sn');

DROP PROCEDURE IF EXISTS SafeAddColumn;
DROP PROCEDURE IF EXISTS SafeAddIndex;
