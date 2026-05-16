-- ============================================================
-- Flyway Migration V058
-- 设备清单孤儿记录清理与档案补建（2026-05-15）
-- 源文件: backend/sql/cleanup_device_orphan_20260515.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. 删除纯演示数据：archive_device_id 为空 + SN 为空 + 无协议配置
DELETE FROM fire_iot_device
WHERE archive_device_id IS NULL
  AND (device_sn IS NULL OR device_sn = '')
  AND (protocol_config IS NULL OR protocol_config = '');

-- 2. 为海康4G/CTWing 设备补建档案（如不存在）
INSERT IGNORE INTO fire_device (device_no, device_sn, device_name, device_type, lifecycle_status, status, created_at, updated_at)
VALUES
('EQ-20260515-001', 'HK-SMOKE-001', '4G烟感', 'smoke_detector', 2, 1, NOW(), NOW()),
('EQ-20260515-002', 'HK-PRESSURE-001', '4G压力表', 'pressure_meter', 2, 1, NOW(), NOW()),
('EQ-20260515-003', 'HK-LEVEL-001', '4G液位表', 'level_meter', 2, 1, NOW(), NOW()),
('EQ-20260515-004', 'test_ctwing_003', 'CTWing测试设备', 'iot_device', 2, 1, NOW(), NOW());

-- 3. 建立 IoT ↔ 档案关联
UPDATE fire_iot_device i
INNER JOIN fire_device d ON d.device_sn = i.device_sn
SET i.archive_device_id = d.id
WHERE i.archive_device_id IS NULL AND i.device_sn IS NOT NULL;

-- 4. 状态修正：有 IoT 接入但 lifecycle_status < 2 的档案 → 升为 2
UPDATE fire_device d
INNER JOIN fire_iot_device i ON i.archive_device_id = d.id
SET d.lifecycle_status = GREATEST(d.lifecycle_status, 2)
WHERE d.lifecycle_status < 2;

-- 5. 状态修正：无 IoT 接入但 lifecycle_status >= 2 的档案 → 降级为 1
UPDATE fire_device d
LEFT JOIN fire_iot_device i ON i.archive_device_id = d.id
SET d.lifecycle_status = 1
WHERE i.id IS NULL AND d.lifecycle_status >= 2;

SET FOREIGN_KEY_CHECKS = 1;
