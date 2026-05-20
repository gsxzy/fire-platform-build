-- ============================================================
-- Flyway Migration V040 (MySQL 5.7 Compatible)
-- 设备档案 ↔ IoT 接入生命周期字段扩展
-- 源文件: backend/sql/device_lifecycle.sql
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

-- 1) 档案表：流程状态 + 可选项目编码
CALL SafeAddColumn('fire_device', 'lifecycle_status', 'TINYINT NOT NULL DEFAULT 1 COMMENT "1已入库 2已接入 3已分配 4维护中 5报废" AFTER status');
CALL SafeAddColumn('fire_device', 'project_code', 'VARCHAR(64) NULL COMMENT "项目/工程编码（分配阶段可选）" AFTER install_location');
CALL SafeAddIndex('fire_device', 'idx_fire_device_lifecycle', 'lifecycle_status');

-- 2) IoT 接入表：唯一关联档案主键
CALL SafeAddColumn('fire_iot_device', 'archive_device_id', 'BIGINT UNSIGNED NULL COMMENT "关联 fire_device.id，唯一" AFTER id');
CALL SafeAddIndex('fire_iot_device', 'uk_fire_iot_device_archive', 'archive_device_id');

-- 3) 历史数据：按 SN / 设备编号对齐 archive_device_id
UPDATE fire_iot_device i
INNER JOIN fire_device d
  ON (d.device_sn IS NOT NULL AND d.device_sn <> '' AND i.device_sn = d.device_sn)
  OR (i.device_sn = d.device_no)
SET i.archive_device_id = d.id
WHERE i.archive_device_id IS NULL;

-- 4) 历史数据：生命周期回填
UPDATE fire_device SET lifecycle_status = 5 WHERE status = 4;

UPDATE fire_device d
INNER JOIN fire_iot_device i ON i.archive_device_id = d.id
SET d.lifecycle_status = GREATEST(d.lifecycle_status, 2)
WHERE d.lifecycle_status < 5;

UPDATE fire_device
SET lifecycle_status = 3
WHERE unit_id IS NOT NULL
  AND lifecycle_status >= 2
  AND lifecycle_status < 4;

DROP PROCEDURE IF EXISTS SafeAddColumn;
DROP PROCEDURE IF EXISTS SafeAddIndex;
