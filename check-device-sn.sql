SELECT device_sn, COUNT(*) as cnt FROM fire_platform.fscn8001_raw_log WHERE device_sn LIKE '%8C%' OR device_sn LIKE '%8c%' GROUP BY device_sn ORDER BY cnt DESC LIMIT 5;
SELECT device_sn, COUNT(*) as cnt FROM fire_platform.fscn8001_raw_log WHERE device_sn LIKE '%E197%' OR device_sn LIKE '%e197%' GROUP BY device_sn ORDER BY cnt DESC LIMIT 5;
SELECT LENGTH(parsed_json) as json_len, COUNT(*) as cnt FROM fire_platform.fscn8001_raw_log GROUP BY json_len ORDER BY cnt DESC LIMIT 10;
