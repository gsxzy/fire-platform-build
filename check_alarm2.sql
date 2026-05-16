USE fire_platform;
SELECT alarm_no, device_name, alarm_type, unit_name, location, status, created_at FROM fire_alarm ORDER BY created_at DESC LIMIT 10;
