SELECT hex_data, cmd_type, created_at FROM fire_platform.fscn8001_raw_log WHERE device_sn = '2211AA3B0000000000000000' ORDER BY id DESC LIMIT 5;
SELECT COUNT(*) as alarm_cnt FROM fire_platform.fire_alarm WHERE protocol='FSCN8001' AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE);
