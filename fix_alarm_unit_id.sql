USE fire_platform;

-- 补全 fire_alarm 的 unit_id / unit_name（通过 device_id 关联 fire_device）
UPDATE fire_alarm a
JOIN fire_device d ON a.device_id = d.id
SET a.unit_id = d.unit_id,
    a.unit_name = (SELECT unit_name FROM fire_unit WHERE id = d.unit_id LIMIT 1)
WHERE a.unit_id IS NULL
  AND a.device_id IS NOT NULL;

-- 统计补全结果
SELECT '补全后 unit_id 仍为 NULL 的报警数' AS `desc`, COUNT(*) AS cnt FROM fire_alarm WHERE status=0 AND unit_id IS NULL;
SELECT '补全后 unit_id 非 NULL 的报警数' AS `desc`, COUNT(*) AS cnt FROM fire_alarm WHERE status=0 AND unit_id IS NOT NULL;
