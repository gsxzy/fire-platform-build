SELECT id, device_id, unit_id, unit_name FROM fire_platform.fire_alarm WHERE id BETWEEN 3877 AND 3881;
SELECT hex_data, created_at FROM fire_platform.fscn8001_raw_log WHERE created_at > '2026-05-10 21:20:00' AND device_sn = '2211AA3B0000000000000000' ORDER BY id DESC LIMIT 3;
