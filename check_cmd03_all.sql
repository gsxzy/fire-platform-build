SELECT device_sn, hex_data, created_at FROM fire_platform.fscn8001_raw_log WHERE cmd_type = '03' ORDER BY id DESC LIMIT 10;
