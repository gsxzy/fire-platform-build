-- 为重复表创建统一视图，解决 multiline_panel/host_multiline 和 bus_panel/host_bus_point 重复问题
-- 查询时使用视图替代直接查询表

CREATE OR REPLACE VIEW v_multiline AS
SELECT id, host_id, point_no, point_name, device_type, status, feedback_status, fault_status, location, sort_order, created_at, updated_at
FROM multiline_panel
UNION
SELECT id, host_id, point_no, point_name, device_type, status, feedback_status, fault_status, location, sort_order, created_at, updated_at
FROM host_multiline;

CREATE OR REPLACE VIEW v_bus_point AS
SELECT id, host_id, loop_no, point_no, point_name, device_type, install_location, status, feedback_status, sort_order, created_at, updated_at
FROM bus_panel
UNION
SELECT id, host_id, loop_no, point_no, point_name, device_type, install_location, status, NULL AS feedback_status, sort_order, created_at, updated_at
FROM host_bus_point;
