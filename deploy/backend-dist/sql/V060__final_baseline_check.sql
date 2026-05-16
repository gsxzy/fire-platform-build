-- ============================================================
-- Flyway Migration V060
-- 最终基线检查与一致性验证
-- 执行时机: 所有迁移完成后手动运行验证
-- ============================================================

-- 1. 验证核心表是否存在
SELECT 'fire_unit' AS table_name, COUNT(*) AS row_count FROM fire_unit
UNION ALL SELECT 'fire_device', COUNT(*) FROM fire_device
UNION ALL SELECT 'fire_iot_device', COUNT(*) FROM fire_iot_device
UNION ALL SELECT 'fire_alarm', COUNT(*) FROM fire_alarm
UNION ALL SELECT 'fire_host', COUNT(*) FROM fire_host
UNION ALL SELECT 'fire_control_room', COUNT(*) FROM fire_control_room
UNION ALL SELECT 'ctwing_raw_log', COUNT(*) FROM ctwing_raw_log
UNION ALL SELECT 'iot_telemetry', COUNT(*) FROM iot_telemetry
UNION ALL SELECT 'linkage_rules', COUNT(*) FROM linkage_rules
UNION ALL SELECT 'linkage_records', COUNT(*) FROM linkage_records;

-- 2. 验证关键索引是否存在
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME IN (
    'idx_fire_device_lifecycle', 'idx_fire_device_sn', 'idx_lifecycle_created',
    'idx_device_search', 'uk_fire_iot_device_archive', 'idx_trigger_alarm_type',
    'idx_record_time', 'idx_host_command_time'
  )
ORDER BY TABLE_NAME, INDEX_NAME;

-- 3. 验证事件调度器状态
SHOW VARIABLES LIKE 'event_scheduler';

-- 4. 验证字符集统一性
SELECT TABLE_NAME, CCSA.CHARACTER_SET_NAME AS charset
FROM information_schema.TABLES T
JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
  ON T.TABLE_COLLATION = CCSA.COLLATION_NAME
WHERE T.TABLE_SCHEMA = DATABASE()
  AND CCSA.CHARACTER_SET_NAME != 'utf8mb4';
