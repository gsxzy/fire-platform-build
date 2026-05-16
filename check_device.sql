SELECT id, device_code, device_name, unit_id, lifecycle_status FROM fire_platform.fire_device WHERE device_code LIKE '%01-002%' LIMIT 5;
SELECT id, device_code, protocol_type, archive_device_id, status FROM fire_platform.fire_iot_device WHERE device_code LIKE '%01-002%' LIMIT 5;
SELECT id, device_code, device_name, unit_id, lifecycle_status FROM fire_platform.fire_device ORDER BY id DESC LIMIT 10;
