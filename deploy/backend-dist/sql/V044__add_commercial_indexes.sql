-- ============================================================
-- Flyway Migration V044
-- 商业环境高频查询索引补充
-- 源文件: backend/sql/commercial_indexes.sql
-- ============================================================

-- 1. 告警中心 (fire_alarm)
CREATE INDEX IF NOT EXISTS idx_fire_alarm_device_id ON fire_alarm(device_id);
CREATE INDEX IF NOT EXISTS idx_fire_alarm_unit_id ON fire_alarm(unit_id);
CREATE INDEX IF NOT EXISTS idx_fire_alarm_status ON fire_alarm(status);
CREATE INDEX IF NOT EXISTS idx_fire_alarm_alarm_type ON fire_alarm(alarm_type);
CREATE INDEX IF NOT EXISTS idx_fire_alarm_alarm_level ON fire_alarm(alarm_level);
CREATE INDEX IF NOT EXISTS idx_fire_alarm_created_at ON fire_alarm(created_at);

-- 2. 设备管理 (fire_device)
CREATE INDEX IF NOT EXISTS idx_fire_device_unit_id ON fire_device(unit_id);
CREATE INDEX IF NOT EXISTS idx_fire_device_device_type ON fire_device(device_type);
CREATE INDEX IF NOT EXISTS idx_fire_device_status ON fire_device(status);
CREATE INDEX IF NOT EXISTS idx_fire_device_building_id ON fire_device(building_id);
CREATE INDEX IF NOT EXISTS idx_fire_device_floor_id ON fire_device(floor_id);

-- 3. IoT 设备接入 (fire_iot_device)
CREATE INDEX IF NOT EXISTS idx_fire_iot_device_unit_id ON fire_iot_device(unit_id);
CREATE INDEX IF NOT EXISTS idx_fire_iot_device_protocol_type ON fire_iot_device(protocol_type);

-- 4. 巡检管理
CREATE INDEX IF NOT EXISTS idx_fire_patrol_record_plan_id ON fire_patrol_record(plan_id);
CREATE INDEX IF NOT EXISTS idx_fire_patrol_record_unit_id ON fire_patrol_record(unit_id);
CREATE INDEX IF NOT EXISTS idx_fire_hazard_unit_id ON fire_hazard(unit_id);
CREATE INDEX IF NOT EXISTS idx_fire_hazard_status ON fire_hazard(status);

-- 5. 维保工单
CREATE INDEX IF NOT EXISTS idx_fire_maint_work_order_device_id ON fire_maint_work_order(device_id);
CREATE INDEX IF NOT EXISTS idx_fire_maint_work_order_unit_id ON fire_maint_work_order(unit_id);
CREATE INDEX IF NOT EXISTS idx_fire_maint_work_order_status ON fire_maint_work_order(status);

-- 6. 设备控制指令
CREATE INDEX IF NOT EXISTS idx_fire_control_command_device_id ON fire_control_command(device_id);
CREATE INDEX IF NOT EXISTS idx_fire_control_command_status ON fire_control_command(status);

-- 7. 值班排班
CREATE INDEX IF NOT EXISTS idx_fire_duty_schedule_user_id ON fire_duty_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_fire_duty_schedule_duty_date ON fire_duty_schedule(duty_date);

-- 8. 系统日志
CREATE INDEX IF NOT EXISTS idx_sys_log_user_id ON sys_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sys_log_created_at ON sys_log(created_at);

-- 9. 用户权限
CREATE INDEX IF NOT EXISTS idx_sys_user_dept_id ON sys_user(dept_id);
CREATE INDEX IF NOT EXISTS idx_sys_user_status ON sys_user(status);
CREATE INDEX IF NOT EXISTS idx_sys_permission_parent_id ON sys_permission(parent_id);
CREATE INDEX IF NOT EXISTS idx_sys_permission_type ON sys_permission(type);
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_user_role ON sys_user_role(user_id, role_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_role_permission ON sys_role_permission(role_id, perm_id);

-- 10. 单位管理
CREATE INDEX IF NOT EXISTS idx_fire_unit_unit_type ON fire_unit(unit_type);
CREATE INDEX IF NOT EXISTS idx_fire_unit_status ON fire_unit(status);

-- 11. 消控室
CREATE INDEX IF NOT EXISTS idx_fire_control_room_unit_id ON fire_control_room(unit_id);
CREATE INDEX IF NOT EXISTS idx_fire_control_room_host_room_id ON fire_control_room_host(room_id);
CREATE INDEX IF NOT EXISTS idx_fire_multiline_panel_host_id ON fire_multiline_panel(host_id);
CREATE INDEX IF NOT EXISTS idx_fire_bus_point_host_id ON fire_bus_point(host_id);
CREATE INDEX IF NOT EXISTS idx_fire_host_command_log_room_id ON fire_host_command_log(room_id);
CREATE INDEX IF NOT EXISTS idx_fire_host_command_log_host_id ON fire_host_command_log(host_id);

-- 12. 建筑楼层
CREATE INDEX IF NOT EXISTS idx_buildings_unit_id ON buildings(unit_id);
CREATE INDEX IF NOT EXISTS idx_floors_building_id ON floors(building_id);
CREATE INDEX IF NOT EXISTS idx_floor_camera_bindings_floor_id ON floor_camera_bindings(floor_id);
