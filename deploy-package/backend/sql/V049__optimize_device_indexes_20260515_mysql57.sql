-- ============================================================
-- Flyway Migration V049 (MySQL 5.7 兼容版)
-- 设备管理索引优化（2026-05-15）
-- 源文件: backend/sql/optimize_device_schema_20260515.sql
-- 说明: 原文件使用 ADD INDEX IF NOT EXISTS（MySQL 8.0+），
--       此版本使用存储过程动态检测，兼容 MySQL 5.7
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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
  ELSE
    SELECT CONCAT('Index ', p_index, ' already exists on ', p_table) AS result;
  END IF;
END$$

DELIMITER ;

-- 1. 复合索引：入库管理列表高频查询（按 lifecycle_status 筛选 + created_at 排序）
CALL SafeAddIndex('fire_device', 'idx_lifecycle_created', 'lifecycle_status, created_at');

-- 2. 复合索引：设备编号/名称/SN 联合搜索
CALL SafeAddIndex('fire_device', 'idx_device_search', 'device_no, device_name, device_sn');

-- 清理存储过程
DROP PROCEDURE IF EXISTS SafeAddIndex;

SET FOREIGN_KEY_CHECKS = 1;
