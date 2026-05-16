SELECT cmd_type, COUNT(*) as cnt FROM fire_platform.fscn8001_raw_log WHERE DATE(created_at) = CURDATE() GROUP BY cmd_type ORDER BY cnt DESC;
SELECT * FROM fire_platform.fscn8001_raw_log WHERE cmd_type != '01' AND cmd_type != '02' AND DATE(created_at) = CURDATE() ORDER BY id DESC LIMIT 10;
