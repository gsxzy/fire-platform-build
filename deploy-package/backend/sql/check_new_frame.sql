SELECT hex_data, cmd_type, created_at FROM fire_platform.fscn8001_raw_log WHERE device_sn = '2211AA3B0000000000000000' AND hex_data LIKE '%3000%02%' ORDER BY id DESC LIMIT 5;
SELECT * FROM fire_platform.fscn8001_alarm WHERE device_sn = '2211AA3B0000000000000000' ORDER BY id DESC LIMIT 5;
