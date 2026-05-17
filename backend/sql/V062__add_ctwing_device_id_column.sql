-- ============================================================
-- Flyway Migration V062
-- CTWing 设备ID 冗余字段 + 索引（替代 JSON_SEARCH 全表扫描）
-- ============================================================

SET NAMES utf8mb4;

-- 1. 添加 ctwing_device_id 字段
SET @addCol = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_iot_device' AND COLUMN_NAME = 'ctwing_device_id'
);
SET @sql = IF(@addCol = 0, 'ALTER TABLE fire_iot_device ADD COLUMN ctwing_device_id VARCHAR(100) COMMENT "CTWing 平台设备ID（冗余字段，避免 JSON_SEARCH 全表扫描）"', 'SELECT "ctwing_device_id already exists" AS result');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 创建索引
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
DELIMITER ;

CALL SafeAddIndex('fire_iot_device', 'idx_ctwing_device_id', 'ctwing_device_id');

-- 3. 同步现有数据：从 protocol_config 提取 ctwing.deviceId 到 ctwing_device_id
UPDATE fire_iot_device
SET ctwing_device_id = JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.ctwing.deviceId'))
WHERE ctwing_device_id IS NULL
  AND protocol_type = 'CTWing'
  AND JSON_EXTRACT(protocol_config, '$.ctwing.deviceId') IS NOT NULL;

DROP PROCEDURE IF EXISTS SafeAddIndex;
