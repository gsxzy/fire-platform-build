SELECT id, device_sn, loop_no, address, status, alarm_type, created_at FROM fire_platform.fscn8001_alarm WHERE device_sn = '2211AA3B0000000000000000' ORDER BY id DESC LIMIT 3;
SELECT id, device_name, location, alarm_type, created_at FROM fire_platform.fire_alarm WHERE protocol='FSCN8001' ORDER BY id DESC LIMIT 3;
