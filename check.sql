USE fire_platform;
SHOW TABLES LIKE 'subsys%';
SELECT COUNT(*) as alarm_with_unit FROM fire_alarm WHERE unit_id IS NOT NULL AND status=0;
SELECT COUNT(*) as devices FROM fire_device;
SELECT id, device_id, unit_id, unit_name, status FROM fire_alarm WHERE status=0 AND device_id IS NOT NULL LIMIT 5;
