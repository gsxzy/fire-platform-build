DESCRIBE fire_platform.fire_device;
SELECT COUNT(*) as total FROM fire_platform.fire_device;
SELECT DISTINCT status FROM fire_platform.fire_device;
SELECT id, device_no, device_name, status, unit_id, protocol_type, created_at FROM fire_platform.fire_device ORDER BY id DESC LIMIT 10;
