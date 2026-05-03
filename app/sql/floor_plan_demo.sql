-- ═══════════════════════════════════════════════════════════════
-- 消防设备平面图 - 演示数据（万达广场F1示例）
-- ═══════════════════════════════════════════════════════════════

-- 假设单位ID为 'UNIT_DEMO_001'，请先确保 units 表中有该记录
-- INSERT INTO units (id, name) VALUES ('UNIT_DEMO_001', '万达广场') ON DUPLICATE KEY UPDATE name='万达广场';

-- 1. 创建建筑：万达广场1号楼
INSERT INTO fire_building (unit_id, name, type, total_floors, address) VALUES
('UNIT_DEMO_001', '万达广场1号楼', '商业', 5, '中山路168号')
ON DUPLICATE KEY UPDATE name='万达广场1号楼';

SET @building_id = LAST_INSERT_ID();

-- 2. 创建楼层 B1-F5
INSERT INTO fire_floor (building_id, name, floor_number) VALUES
(@building_id, 'B1 地下车库', -1),
(@building_id, 'F1 大厅', 1),
(@building_id, 'F2 商铺', 2),
(@building_id, 'F3 餐饮', 3),
(@building_id, 'F4 影院', 4),
(@building_id, 'F5 办公', 5)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 获取 F1 楼层ID（假设刚插入的是倒数第5条）
-- 实际使用时请根据实际ID替换
SET @floor_f1 = (SELECT id FROM fire_floor WHERE building_id = @building_id AND floor_number = 1 LIMIT 1);

-- 3. 在 fire_iot_device 中插入演示设备（如果表中没有）
INSERT INTO fire_iot_device (device_id, device_name, protocol, unit_id, status, online_status) VALUES
('SMOKE_001', '1号烟感', 'gb26875', 'UNIT_DEMO_001', 'normal', 'online'),
('SMOKE_002', '2号烟感', 'gb26875', 'UNIT_DEMO_001', 'normal', 'online'),
('SMOKE_003', '3号烟感', 'gb26875', 'UNIT_DEMO_001', 'normal', 'online'),
('SMOKE_004', '4号烟感', 'gb26875', 'UNIT_DEMO_001', 'normal', 'online'),
('SMOKE_005', '5号烟感', 'gb26875', 'UNIT_DEMO_001', 'normal', 'online'),
('HEAT_001', '1号温感', 'gb26875', 'UNIT_DEMO_001', 'normal', 'online'),
('MANUAL_001', '1号手报', 'gb26875', 'UNIT_DEMO_001', 'normal', 'online'),
('HYDRANT_001', '1号消火栓', 'gb26875', 'UNIT_DEMO_001', 'normal', 'online')
ON DUPLICATE KEY UPDATE device_name=VALUES(device_name);

-- 4. 在 F1 平面图上标点设备（百分比坐标）
-- 注意：请先上传 F1 平面图，然后执行以下标点
INSERT INTO fire_floor_device_position (floor_id, device_id, x, y) VALUES
(@floor_f1, 'SMOKE_001', 25, 30),
(@floor_f1, 'SMOKE_002', 50, 25),
(@floor_f1, 'SMOKE_003', 75, 35),
(@floor_f1, 'SMOKE_004', 40, 60),
(@floor_f1, 'SMOKE_005', 70, 70),
(@floor_f1, 'HEAT_001', 55, 50),
(@floor_f1, 'MANUAL_001', 20, 75),
(@floor_f1, 'HYDRANT_001', 80, 55)
ON DUPLICATE KEY UPDATE x=VALUES(x), y=VALUES(y);

-- 5. 插入摄像头（如果 cameras 表中没有）
INSERT INTO cameras (id, name, unit_id, stream_url, status, online_status) VALUES
('CAM_001', '大厅东摄像头', 'UNIT_DEMO_001', '', 'normal', 'online')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 6. 关联摄像头（看1-3号烟感区域）
INSERT INTO fire_floor_camera_binding (floor_id, camera_device_id, bound_device_ids, x, y, preset_no) VALUES
(@floor_f1, 'CAM_001', '["SMOKE_001", "SMOKE_002", "SMOKE_003"]', 50, 30, 1)
ON DUPLICATE KEY UPDATE bound_device_ids=VALUES(bound_device_ids), x=VALUES(x), y=VALUES(y);
