SELECT COUNT(*) as alarm_count FROM smart_fire.alarms WHERE device_id = '8C0000000000000000000000';
SELECT id, device_id, alarm_type, alarm_level, description, status, start_time FROM smart_fire.alarms WHERE device_id = '8C0000000000000000000000' ORDER BY id DESC LIMIT 5;
