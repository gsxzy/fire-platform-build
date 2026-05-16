SELECT id, hex_data, parsed_json, created_at FROM fire_platform.fscn8001_raw_log WHERE parsed_json->>'$.typeFlag' = '28' AND DATE(created_at) = CURDATE() ORDER BY id DESC LIMIT 10;
