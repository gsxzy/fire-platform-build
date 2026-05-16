-- ═══════════════════════════════════════════════════════════════════
-- 设备清单数据一致性清理与补全（2026-05-15）
-- 目标：删除纯演示/测试孤儿数据，为海康4G/CTWing自动注册设备补建档案
-- ═══════════════════════════════════════════════════════════════════

USE fire_platform;

-- 1. 删除纯演示数据：SN为NULL、无协议配置、无archive_device_id的IoT记录（id 1-11）
DELETE FROM fire_iot_device
WHERE (archive_device_id IS NULL OR archive_device_id = 0)
  AND (device_sn IS NULL OR device_sn = '')
  AND (protocol_type IS NULL OR protocol_type = '');

-- 2. 为海康4G自动注册设备创建档案记录（若不存在同名SN档案）
--    海康4G烟感 HK-SMOKE-001
INSERT INTO fire_device
  (device_no, device_name, device_type, manufacturer, device_model, device_sn, status, lifecycle_status, protocol_type, online_status, install_date, created_at, updated_at)
SELECT
  CONCAT('EQ-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND()*900)+100, 3, '0')),
  '海康4G烟感 NP-FY300',
  'iot-sensor',
  '海康威视',
  'NP-FY300-4G',
  'HK-SMOKE-001',
  1, 2, 'Hikvision4G', 1, CURDATE(), NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM fire_device WHERE device_sn = 'HK-SMOKE-001');

-- 3. 为海康4G压力表创建档案
INSERT INTO fire_device
  (device_no, device_name, device_type, manufacturer, device_model, device_sn, status, lifecycle_status, protocol_type, online_status, install_date, created_at, updated_at)
SELECT
  CONCAT('EQ-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND()*900)+100, 3, '0')),
  '海康4G压力表 NP-FSC200',
  'pressure-sensor',
  '海康威视',
  'NP-FSC200-4G',
  'HK-PRESSURE-001',
  1, 2, 'Hikvision4G', 1, CURDATE(), NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM fire_device WHERE device_sn = 'HK-PRESSURE-001');

-- 4. 为海康4G液位表创建档案
INSERT INTO fire_device
  (device_no, device_name, device_type, manufacturer, device_model, device_sn, status, lifecycle_status, protocol_type, online_status, install_date, created_at, updated_at)
SELECT
  CONCAT('EQ-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND()*900)+100, 3, '0')),
  '海康4G液位表 NP-FSC210',
  'level-sensor',
  '海康威视',
  'NP-FSC210-4G',
  'HK-LEVEL-001',
  1, 2, 'Hikvision4G', 1, CURDATE(), NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM fire_device WHERE device_sn = 'HK-LEVEL-001');

-- 5. 为CTWing测试设备创建档案（SN test_ctwing_003）
INSERT INTO fire_device
  (device_no, device_name, device_type, manufacturer, device_model, device_sn, status, lifecycle_status, protocol_type, online_status, install_date, created_at, updated_at)
SELECT
  CONCAT('EQ-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND()*900)+100, 3, '0')),
  'CTWing海康4G测试设备',
  'iot-sensor',
  '海康威视',
  'CTWing-4G',
  'test_ctwing_003',
  1, 2, 'MQTT', 1, CURDATE(), NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM fire_device WHERE device_sn = 'test_ctwing_003');

-- 6. 更新IoT记录，建立 archive_device_id 关联（BINARY规避collation冲突）
UPDATE fire_iot_device i
JOIN fire_device d ON BINARY i.device_sn = BINARY d.device_sn
SET i.archive_device_id = d.id
WHERE i.archive_device_id IS NULL OR i.archive_device_id = 0;

-- 7. 修正档案状态：有IoT接入但 lifecycle_status < 2 的，升为已接入(2)
UPDATE fire_device d
JOIN fire_iot_device i ON d.id = i.archive_device_id
SET d.lifecycle_status = 2
WHERE d.lifecycle_status < 2;

-- 8. 修正档案状态：无IoT接入但 lifecycle_status >= 2 的，降级为已入库(1)
UPDATE fire_device d
LEFT JOIN fire_iot_device i ON d.id = i.archive_device_id
SET d.lifecycle_status = 1
WHERE d.lifecycle_status >= 2 AND i.id IS NULL;
