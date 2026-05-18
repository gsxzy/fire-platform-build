-- ═══════════════════════════════════════════════════════════════════
-- 修复 CTWing 设备 ctwing_device_id 同步（2026-05-17）
-- 背景：mapIotDevicePayload 未将 ctwingDeviceId 写入 ctwing_device_id 独立字段
--       导致 CTWing 推送时无法匹配到 IoT 设备，告警无法创建
-- ═══════════════════════════════════════════════════════════════════

-- 1. 将 protocol_config JSON 中的 ctwingDeviceId 同步到 ctwing_device_id 字段
UPDATE fire_iot_device
SET ctwing_device_id = JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.accessMeta.ctwingDeviceId'))
WHERE protocol_type = 'CTWing'
  AND (ctwing_device_id IS NULL OR ctwing_device_id = '')
  AND JSON_EXTRACT(protocol_config, '$.accessMeta.ctwingDeviceId') IS NOT NULL;

-- 2. 兼容旧字段名 ctwing_device_id（snake_case 版本）
UPDATE fire_iot_device
SET ctwing_device_id = JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.accessMeta.ctwing_device_id'))
WHERE protocol_type = 'CTWing'
  AND (ctwing_device_id IS NULL OR ctwing_device_id = '')
  AND JSON_EXTRACT(protocol_config, '$.accessMeta.ctwing_device_id') IS NOT NULL;

-- 3. 兼容 ctwing 嵌套结构
UPDATE fire_iot_device
SET ctwing_device_id = JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.ctwing.ctwingDeviceId'))
WHERE protocol_type = 'CTWing'
  AND (ctwing_device_id IS NULL OR ctwing_device_id = '')
  AND JSON_EXTRACT(protocol_config, '$.ctwing.ctwingDeviceId') IS NOT NULL;

-- 4. 验证：统计已同步数量
SELECT '已同步 ctwing_device_id 的设备数' AS description, COUNT(*) AS count
FROM fire_iot_device
WHERE protocol_type = 'CTWing' AND ctwing_device_id IS NOT NULL AND ctwing_device_id != '';

-- 5. 验证：统计仍未同步的设备（需人工检查）
SELECT id, device_sn, device_name, protocol_config
FROM fire_iot_device
WHERE protocol_type = 'CTWing'
  AND (ctwing_device_id IS NULL OR ctwing_device_id = '')
  AND protocol_config LIKE '%ctwing%'
LIMIT 20;
