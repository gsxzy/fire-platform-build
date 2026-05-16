SELECT id, device_sn, device_name, device_type, protocol_type, lifecycle_status, unit_id, status FROM fire_device WHERE lifecycle_status = 2 AND (unit_id IS NULL OR unit_id = 0);
