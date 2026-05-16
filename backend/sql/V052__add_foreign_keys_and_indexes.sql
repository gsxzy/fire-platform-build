-- ============================================================
-- Flyway Migration V052
-- 商用交付外键约束与高频索引补充
-- 源文件: app/sql/commercial_delivery.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 设备档案表外键约束
ALTER TABLE devices ADD CONSTRAINT IF NOT EXISTS fk_devices_unit_id FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE iot_devices ADD CONSTRAINT IF NOT EXISTS fk_iot_devices_unit_id FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE cameras ADD CONSTRAINT IF NOT EXISTS fk_cameras_unit_id FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE gb28181_devices ADD CONSTRAINT IF NOT EXISTS fk_gb28181_devices_unit_id FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 高频查询索引补充
CREATE INDEX IF NOT EXISTS idx_alarms_status_type ON alarms(status, type);
CREATE INDEX IF NOT EXISTS idx_alarms_created_at ON alarms(created_at);
CREATE INDEX IF NOT EXISTS idx_alarms_unit_id ON alarms(unit_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_patrol_records_plan_id ON patrol_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_patrol_records_status ON patrol_records(status);
CREATE INDEX IF NOT EXISTS idx_hazards_status ON hazards(status);
CREATE INDEX IF NOT EXISTS idx_hazards_level ON hazards(level);
CREATE INDEX IF NOT EXISTS idx_control_room_host_id ON control_room_realtime(host_id);
CREATE INDEX IF NOT EXISTS idx_feedback_host_point ON feedback_record(host_id, loop_no, point_no);
CREATE INDEX IF NOT EXISTS idx_command_log_host ON control_command_log(host_id, created_at);

-- 统一字符集
ALTER DATABASE fire_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
