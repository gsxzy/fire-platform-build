-- ============================================================
-- Flyway Migration V045
-- 生产环境 schema 修复 — fire_unit / fire_device 字段补齐
-- 源文件: backend/sql/fix_production_schema.sql
-- ============================================================

-- fire_unit：添加缺失字段及索引
ALTER TABLE fire_unit
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(128) NULL COMMENT '联系邮箱',
  ADD COLUMN IF NOT EXISTS legal_person VARCHAR(64) NULL COMMENT '法人',
  ADD COLUMN IF NOT EXISTS license_no VARCHAR(64) NULL COMMENT '许可证号';

ALTER TABLE fire_unit ADD INDEX IF NOT EXISTS idx_contact_email (contact_email);
ALTER TABLE fire_unit ADD INDEX IF NOT EXISTS idx_legal_person (legal_person);
ALTER TABLE fire_unit ADD INDEX IF NOT EXISTS idx_license_no (license_no);

-- fire_device：添加缺失字段及索引
ALTER TABLE fire_device
  ADD COLUMN IF NOT EXISTS remark VARCHAR(512) NULL COMMENT '备注',
  ADD COLUMN IF NOT EXISTS config JSON NULL COMMENT '设备配置',
  ADD COLUMN IF NOT EXISTS online_status TINYINT DEFAULT 0 COMMENT '在线状态：0离线 1在线 2故障',
  ADD COLUMN IF NOT EXISTS calibration_cycle INT DEFAULT 12 COMMENT '检定周期（月）',
  ADD COLUMN IF NOT EXISTS scrap_year INT DEFAULT NULL COMMENT '报废年限',
  ADD COLUMN IF NOT EXISTS gateway_id VARCHAR(64) NULL COMMENT '网关ID';

ALTER TABLE fire_device ADD INDEX IF NOT EXISTS idx_remark (remark(100));
ALTER TABLE fire_device ADD INDEX IF NOT EXISTS idx_online_status (online_status);
ALTER TABLE fire_device ADD INDEX IF NOT EXISTS idx_calibration_cycle (calibration_cycle);
ALTER TABLE fire_device ADD INDEX IF NOT EXISTS idx_scrap_year (scrap_year);
ALTER TABLE fire_device ADD INDEX IF NOT EXISTS idx_gateway_id (gateway_id);

-- 修复 NULL 值导致的查询异常
UPDATE fire_device SET lifecycle_status = 1 WHERE lifecycle_status IS NULL;
UPDATE fire_device SET status = 1 WHERE status IS NULL;
UPDATE fire_unit SET unit_type = 'commercial' WHERE unit_type IS NULL;
UPDATE fire_unit SET fire_level = '一般' WHERE fire_level IS NULL;
