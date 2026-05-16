SELECT COUNT(*) as total FROM fire_platform.fscn8001_device;
SELECT * FROM fire_platform.fscn8001_device ORDER BY id DESC LIMIT 20;
SELECT COUNT(*) as total FROM fire_platform.fire_device;
SELECT * FROM fire_platform.fire_device WHERE protocol_type = 'FSCN8001' ORDER BY id DESC LIMIT 20;
