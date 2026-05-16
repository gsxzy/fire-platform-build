SELECT hex_data, cmd_type, created_at FROM fire_platform.fscn8001_raw_log WHERE device_sn = '2211AA3B0000000000000000' ORDER BY id DESC LIMIT 5;
SELECT id, device_sn, loop_no, address, status, alarm_type, alarm_time FROM fire_platform.fscn8001_alarm WHERE device_sn = '2211AA3B0000000000000000' ORDER BY id DESC LIMIT 5;
SELECT id, device_name, unit_name, location, alarm_type, created_at FROM fire_platform.fire_alarm WHERE protocol='FSCN8001' ORDER BY id DESC LIMIT 5;
