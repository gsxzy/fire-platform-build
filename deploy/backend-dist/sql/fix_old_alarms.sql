UPDATE fire_platform.fire_alarm SET device_id=1323, unit_id=32, unit_name='甘肃赋安' WHERE id BETWEEN 3877 AND 3881;
SELECT id, device_name, unit_name, location, alarm_type, created_at FROM fire_platform.fire_alarm WHERE id >= 3882 ORDER BY id DESC LIMIT 5;
