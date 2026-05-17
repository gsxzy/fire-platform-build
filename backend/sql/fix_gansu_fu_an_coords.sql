-- 修复甘肃赋安单位及设备坐标缺失问题
-- 执行时间: 2026-05-16

-- 1. 为甘肃赋安补全经度坐标（纬度已存在 36.0766430，对应兰州地区）
UPDATE fire_unit SET lng = 103.8263 WHERE id = 32 AND lng IS NULL;

-- 2. 为甘肃赋安下的设备同步继承单位坐标（仅对无坐标的设备）
UPDATE fire_device 
SET lng = 103.8263, lat = 36.0766430 
WHERE unit_id = 32 AND (lng IS NULL OR lat IS NULL);

-- 验证
SELECT id, unit_name, lng, lat FROM fire_unit WHERE id = 32;
SELECT id, device_name, lng, lat FROM fire_device WHERE unit_id = 32;
