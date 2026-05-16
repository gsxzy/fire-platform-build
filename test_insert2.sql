INSERT INTO fire_platform.fscn8001_alarm
(device_sn, alarm_type, alarm_level, location, loop_no, address, host_code, device_type, status, alarm_time, raw_data)
VALUES ('TEST123', 'fire', 'high', '测试报警', 1, 1, 'HOST001', '手报', 0, NOW(), '4040TEST');
SELECT * FROM fire_platform.fscn8001_alarm WHERE device_sn = 'TEST123';
DELETE FROM fire_platform.fscn8001_alarm WHERE device_sn = 'TEST123';
