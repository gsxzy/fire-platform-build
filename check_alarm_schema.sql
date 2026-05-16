SHOW COLUMNS FROM fire_platform.fire_alarm;
SELECT COUNT(*) as alarm_count FROM fire_platform.fire_alarm WHERE created_at > '2026-05-10 19:00:00';
SELECT COUNT(*) as total_alarms FROM fire_platform.fire_alarm;
