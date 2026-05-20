-- ============================================================
-- Flyway Migration V038 (MySQL 5.7 Compatible)
-- 为 fire_iot_device 表扩展协议相关字段
-- 源文件: fix_iot.sql
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

CALL SafeAddColumn('fire_iot_device', 'device_type', 'VARCHAR(30) NULL AFTER device_name');
CALL SafeAddColumn('fire_iot_device', 'protocol_type', 'VARCHAR(20) NULL AFTER device_type');
CALL SafeAddColumn('fire_iot_device', 'protocol_config', 'TEXT NULL AFTER protocol_type');
CALL SafeAddColumn('fire_iot_device', 'ip_address', 'VARCHAR(50) NULL AFTER last_online');
CALL SafeAddColumn('fire_iot_device', 'data_format', 'VARCHAR(20) NULL AFTER port');

DROP PROCEDURE IF EXISTS SafeAddColumn;
