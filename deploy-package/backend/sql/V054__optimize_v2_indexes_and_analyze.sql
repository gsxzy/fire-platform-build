-- ============================================================
-- Flyway Migration V054
-- 数据库优化 v2.1 — 高频索引补充与统计信息更新
-- 源文件: app/sql/optimize_v2.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 核心表高频查询索引补充
ALTER TABLE fire_host ADD INDEX IF NOT EXISTS idx_brand_status (brand, status);
ALTER TABLE fire_loop ADD INDEX IF NOT EXISTS idx_host_status (host_id, status);
ALTER TABLE fire_device ADD INDEX IF NOT EXISTS idx_host_loop_status (host_id, loop_no, status);
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_type_time (alarm_type, alarm_time);
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_status_time (status, alarm_time);
ALTER TABLE control_room_realtime ADD INDEX IF NOT EXISTS idx_room_id (room_id);
ALTER TABLE control_room_command_log ADD INDEX IF NOT EXISTS idx_type_time (command_type, command_time);
ALTER TABLE multiline_panel ADD INDEX IF NOT EXISTS idx_host_point (host_id, point_no);
ALTER TABLE bus_panel ADD INDEX IF NOT EXISTS idx_host_loop_point (host_id, loop_no, point_no);

-- 2. 覆盖索引优化
ALTER TABLE fire_device ADD INDEX IF NOT EXISTS idx_cover_list (host_id, loop_no, status, device_type, location, address);
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_cover_list (device_sn, alarm_type, status, alarm_time, location, host_code);

-- 3. 统计信息更新
ANALYZE TABLE fire_host;
ANALYZE TABLE fire_loop;
ANALYZE TABLE fire_device;
ANALYZE TABLE fscn8001_alarm;
ANALYZE TABLE fscn8001_device;
ANALYZE TABLE control_room_realtime;
ANALYZE TABLE control_room_command_log;
ANALYZE TABLE multiline_panel;
ANALYZE TABLE bus_panel;
ANALYZE TABLE devices;
ANALYZE TABLE iot_devices;
ANALYZE TABLE cameras;
ANALYZE TABLE gb28181_devices;
ANALYZE TABLE users;

-- 4. 表结构优化（InnoDB 碎片整理）
OPTIMIZE TABLE fire_host;
OPTIMIZE TABLE fire_loop;
OPTIMIZE TABLE fire_device;
OPTIMIZE TABLE fscn8001_alarm;
OPTIMIZE TABLE fscn8001_device;

SET FOREIGN_KEY_CHECKS = 1;
