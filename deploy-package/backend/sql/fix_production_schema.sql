-- ═══════════════════════════════════════════════════════════════════
-- 智慧消防平台 - 生产环境数据库修复与优化脚本
-- 执行前请备份数据库！
-- 用途：修复设备/单位保存失败、补齐缺失字段、添加性能索引
-- 执行：mysql -uroot -p fire_platform < fix_production_schema.sql
-- ═══════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────────────────────────
-- 1. fire_unit 表修复（单位管理）
-- ─────────────────────────────────────────────────────────────────

-- 1.1 补齐缺失字段
ALTER TABLE fire_unit
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100) COMMENT '联系邮箱' AFTER contact_phone,
  ADD COLUMN IF NOT EXISTS legal_person VARCHAR(50) COMMENT '法人' AFTER contact_email,
  ADD COLUMN IF NOT EXISTS license_no VARCHAR(64) COMMENT '统一社会信用代码' AFTER legal_person;

-- 1.2 添加索引（若不存在）
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

-- ─────────────────────────────────────────────────────────────────
-- 2. fire_device 表修复（设备管理 - 核心修复）
-- ─────────────────────────────────────────────────────────────────

-- 2.1 补齐缺失字段（导致保存失败的关键字段）
ALTER TABLE fire_device
  ADD COLUMN IF NOT EXISTS remark TEXT COMMENT '备注' AFTER point_id,
  ADD COLUMN IF NOT EXISTS config TEXT COMMENT '扩展配置JSON' AFTER remark,
  ADD COLUMN IF NOT EXISTS online_status TINYINT DEFAULT 0 COMMENT '在线状态：0离线 1在线' AFTER config,
  ADD COLUMN IF NOT EXISTS calibration_cycle INT COMMENT '校准周期(月)' AFTER online_status,
  ADD COLUMN IF NOT EXISTS scrap_year INT COMMENT '报废年限(年)' AFTER calibration_cycle,
  ADD COLUMN IF NOT EXISTS gateway_id VARCHAR(100) COMMENT '传输装置ID' AFTER scrap_year;

-- 2.2 确保 device_no 唯一索引存在（保存失败的另一根因）
SELECT COUNT(1) INTO @idx_exists FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_device' AND INDEX_NAME = 'device_no';
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE fire_device ADD UNIQUE INDEX device_no (device_no)',
  'SELECT "device_no_unique_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.3 添加缺失的业务索引
SELECT COUNT(1) INTO @idx_exists FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_device' AND INDEX_NAME = 'idx_device_sn';
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE fire_device ADD INDEX idx_device_sn (device_sn)', 'SELECT "idx_device_sn_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(1) INTO @idx_exists FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_device' AND INDEX_NAME = 'idx_lifecycle_status';
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE fire_device ADD INDEX idx_lifecycle_status (lifecycle_status)', 'SELECT "idx_lifecycle_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────────
-- 3. 其他高频表索引优化（商用交付性能保障）
-- ─────────────────────────────────────────────────────────────────

-- fire_alarm 索引优化
SELECT COUNT(1) INTO @idx_exists FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_alarm' AND INDEX_NAME = 'idx_created_at';
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE fire_alarm ADD INDEX idx_created_at (created_at)', 'SELECT "idx_alarm_created_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fire_control_room 索引
SELECT COUNT(1) INTO @idx_exists FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_control_room' AND INDEX_NAME = 'idx_cr_unit_id';
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE fire_control_room ADD INDEX idx_cr_unit_id (unit_id)', 'SELECT "idx_cr_unit_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fire_iot_device 索引
SELECT COUNT(1) INTO @idx_exists FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_iot_device' AND INDEX_NAME = 'idx_iot_unit_id';
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE fire_iot_device ADD INDEX idx_iot_unit_id (unit_id)', 'SELECT "idx_iot_unit_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────────
-- 4. 数据一致性修复
-- ─────────────────────────────────────────────────────────────────

-- 4.1 修复 lifecycle_status 为 NULL 的设备（设为已入库 1）
UPDATE fire_device SET lifecycle_status = 1 WHERE lifecycle_status IS NULL;

-- 4.2 修复 status 为 NULL 的设备（设为正常 1）
UPDATE fire_device SET status = 1 WHERE status IS NULL;

-- 4.3 修复 unit_type 为 NULL 的单位（设为一般单位 1）
UPDATE fire_unit SET unit_type = 1 WHERE unit_type IS NULL;

-- 4.4 修复 fire_level 为 NULL 的单位（设为 1）
UPDATE fire_unit SET fire_level = 1 WHERE fire_level IS NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────────────────────────
-- 5. 验证输出
-- ─────────────────────────────────────────────────────────────────
SELECT 'fire_unit 字段' as check_item, COUNT(*) as column_count
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_unit';

SELECT 'fire_device 字段' as check_item, COUNT(*) as column_count
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_device';

SELECT 'fire_device 索引' as check_item, COUNT(*) as index_count
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fire_device';
