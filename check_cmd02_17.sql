SELECT COUNT(*) as cnt FROM fire_platform.fscn8001_raw_log WHERE cmd_type = '02' AND device_sn = '2211AA3B0000000000000000' AND hex_data LIKE '%17%';
SELECT hex_data, created_at FROM fire_platform.fscn8001_raw_log WHERE cmd_type = '02' AND device_sn = '2211AA3B0000000000000000' AND hex_data LIKE '%17%' ORDER BY id DESC LIMIT 5;
