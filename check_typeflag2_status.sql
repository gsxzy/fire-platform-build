SELECT hex_data FROM fire_platform.fscn8001_raw_log WHERE JSON_EXTRACT(parsed_json, '$.typeFlag') = 2 ORDER BY id DESC LIMIT 50;
