SELECT hex_data FROM fire_platform.fscn8001_raw_log WHERE JSON_EXTRACT(parsed_json, '$.typeFlag') = 2 AND hex_data NOT LIKE '%1C%' ORDER BY id DESC LIMIT 10;
