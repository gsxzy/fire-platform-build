SELECT device_sn, device_name, device_type, protocol_type, status FROM fire_platform.fire_iot_device WHERE protocol_type = 'Hikvision4G';
SELECT alarm_no, device_name, alarm_desc, status FROM fire_platform.fire_alarm WHERE protocol = 'Hikvision4G' ORDER BY id DESC LIMIT 3;
SELECT device_sn, event_type, created_at FROM fire_platform.hikvision4g_raw_log ORDER BY id DESC LIMIT 3;
