SELECT COUNT(*) as cnt FROM fire_platform.fire_alarm WHERE protocol='FSCN8001' AND created_at > '2026-05-10 20:00:00';
SELECT id, alarm_type, location, created_at FROM fire_platform.fire_alarm WHERE protocol='FSCN8001' AND created_at > '2026-05-10 20:00:00' ORDER BY id DESC LIMIT 5;
