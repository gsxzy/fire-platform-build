-- ============================================================
-- Flyway Migration V039 (MySQL 5.7 Compatible)
-- 为 fscn8001_alarm 表添加原始帧数据字段
-- 源文件: fix_table.sql
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

DELIMITER ;

CALL SafeAddColumn('fscn8001_alarm', 'raw_data', 'TEXT NULL COMMENT "原始帧数据" AFTER notes');

DROP PROCEDURE IF EXISTS SafeAddColumn;
