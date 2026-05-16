-- ═══════════════════════════════════════════════════════════════════
-- Flyway Migration V036
-- 生产修复：单位表补齐缺失字段
-- 来源：backend/sql/fix_production_schema.sql 拆分
-- 依赖：V001（单位表已创建）
-- 幂等性：ADD COLUMN IF NOT EXISTS（MySQL 8.0+）
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 补齐缺失字段
ALTER TABLE fire_unit
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100) COMMENT '联系邮箱' AFTER contact_phone,
  ADD COLUMN IF NOT EXISTS legal_person VARCHAR(50) COMMENT '法人' AFTER contact_email,
  ADD COLUMN IF NOT EXISTS license_no VARCHAR(64) COMMENT '统一社会信用代码' AFTER legal_person;

-- 添加索引（若不存在）
SELECT COUNT(1) INTO @idx_exists FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_unit' AND INDEX_NAME = 'idx_unit_code';
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE fire_unit ADD INDEX idx_unit_code (unit_code)', 'SELECT "idx_unit_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(1) INTO @idx_exists FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_unit' AND INDEX_NAME = 'idx_unit_type';
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE fire_unit ADD INDEX idx_unit_type (unit_type)', 'SELECT "idx_unit_type_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(1) INTO @idx_exists FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_unit' AND INDEX_NAME = 'idx_fire_level';
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE fire_unit ADD INDEX idx_fire_level (fire_level)', 'SELECT "idx_fire_level_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
