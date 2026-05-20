-- ═══════════════════════════════════════════════════════════════════
-- Flyway Migration V036 (MySQL 5.7 Compatible)
-- 生产修复：单位表补齐缺失字段
-- 来源：backend/sql/fix_production_schema.sql 拆分
-- 依赖：V001（单位表已创建）
-- 幂等性：存储过程动态检测（MySQL 5.7 兼容）
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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

-- 补齐缺失字段
CALL SafeAddColumn('fire_unit', 'contact_email', 'VARCHAR(100) COMMENT "联系邮箱" AFTER contact_phone');
CALL SafeAddColumn('fire_unit', 'legal_person', 'VARCHAR(50) COMMENT "法人" AFTER contact_email');
CALL SafeAddColumn('fire_unit', 'license_no', 'VARCHAR(64) COMMENT "统一社会信用代码" AFTER legal_person');

-- 添加索引
CALL SafeAddIndex('fire_unit', 'idx_unit_code', 'unit_code');
CALL SafeAddIndex('fire_unit', 'idx_unit_type', 'unit_type');
CALL SafeAddIndex('fire_unit', 'idx_fire_level', 'fire_level');

DROP PROCEDURE IF EXISTS SafeAddColumn;
DROP PROCEDURE IF EXISTS SafeAddIndex;

SET FOREIGN_KEY_CHECKS = 1;
