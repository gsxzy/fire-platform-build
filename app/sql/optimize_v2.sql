-- ============================================================
-- 智慧消防平台 - 数据库优化脚本 v2.1
-- 文件: sql/optimize_v2.sql
-- 说明: 本脚本在前版 optimize_production.sql 基础上，
--       补充更多高频查询索引、查询优化提示及统计信息更新。
-- 执行前建议: mysqldump -u root -p fire_platform > backup.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 核心表高频查询索引补充
-- ============================================================

-- fire_host: 按品牌、状态快速筛选
ALTER TABLE fire_host ADD INDEX IF NOT EXISTS idx_brand_status (brand, status);

-- fire_loop: 按主机+状态查询
ALTER TABLE fire_loop ADD INDEX IF NOT EXISTS idx_host_status (host_id, status);

-- fire_device: 按主机+回路+状态查询（消控室实时状态常用）
ALTER TABLE fire_device ADD INDEX IF NOT EXISTS idx_host_loop_status (host_id, loop_no, status);

-- fscn8001_alarm: 按报警类型+时间范围查询（告警统计常用）
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_type_time (alarm_type, alarm_time);

-- fscn8001_alarm: 按状态+时间（待处理告警查询）
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_status_time (status, alarm_time);

-- control_room_realtime: 按消控室ID查询
ALTER TABLE control_room_realtime ADD INDEX IF NOT EXISTS idx_room_id (room_id);

-- control_room_command_log: 按命令类型+时间查询
ALTER TABLE control_room_command_log ADD INDEX IF NOT EXISTS idx_type_time (command_type, command_time);

-- multiline_panel: 按主机+点位号查询
ALTER TABLE multiline_panel ADD INDEX IF NOT EXISTS idx_host_point (host_id, point_no);

-- bus_panel: 按主机+回路+点位号查询
ALTER TABLE bus_panel ADD INDEX IF NOT EXISTS idx_host_loop_point (host_id, loop_no, point_no);

-- ============================================================
-- 2. 覆盖索引优化（Covering Index）
-- ============================================================

-- fire_device 列表查询覆盖索引：减少回表
ALTER TABLE fire_device ADD INDEX IF NOT EXISTS idx_cover_list (host_id, loop_no, status, device_type, location, address);

-- fscn8001_alarm 列表查询覆盖索引
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_cover_list (device_sn, alarm_type, status, alarm_time, location, host_code);

-- ============================================================
-- 3. 统计信息更新（执行后建议 ANALYZE TABLE）
-- ============================================================

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

-- ============================================================
-- 4. 表结构检查与优化
-- ============================================================

-- 检查并优化表碎片（仅 InnoDB）
OPTIMIZE TABLE fire_host;
OPTIMIZE TABLE fire_loop;
OPTIMIZE TABLE fire_device;
OPTIMIZE TABLE fscn8001_alarm;
OPTIMIZE TABLE fscn8001_device;

-- ============================================================
-- 5. 查询缓存与性能变量建议（需在 my.cnf/my.ini 中配置）
-- ============================================================

/*
-- 以下配置建议写入 MySQL 配置文件：

[mysqld]
# InnoDB 缓冲池大小（建议设置为物理内存的 50%-75%）
innodb_buffer_pool_size = 1G

# 连接数
max_connections = 200

# 临时表大小
tmp_table_size = 64M
max_heap_table_size = 64M

# 排序缓冲区
sort_buffer_size = 2M

# 查询缓存（MySQL 8.0 已移除，请使用第三方缓存如 Redis）

# 日志配置
slow_query_log = 1
long_query_time = 2
log_queries_not_using_indexes = 1

# InnoDB 日志文件大小
innodb_log_file_size = 256M
innodb_log_buffer_size = 16M

# 刷新策略
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
*/

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 脚本执行完毕
-- ============================================================
