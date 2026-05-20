SELECT id, room_name, unit_id FROM fire_platform.fire_control_room WHERE id=1;
SELECT id, device_name, device_type, device_sn, protocol_type, unit_id, status FROM fire_platform.fire_device WHERE unit_id IN (SELECT unit_id FROM fire_platform.fire_control_room WHERE id=1) LIMIT 20;
SELECT id, device_name, device_type, device_sn, protocol_type, unit_id, status FROM fire_platform.fire_iot_device WHERE unit_id IN (SELECT unit_id FROM fire_platform.fire_control_room WHERE id=1) LIMIT 20;
SELECT * FROM fire_platform.control_room_video WHERE room_id=1;
