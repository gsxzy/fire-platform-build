-- ============================================================
-- 智慧消防平台 - 生产环境数据库优化脚本
-- 文件: sql/optimize_production.sql
-- 说明: 本脚本包含密码安全加固、索引优化、时序分区、
--       日志TTL清理、性能监控及字符集统一检查
-- 执行前建议: 先备份数据库 mysqldump -u root -p fire_platform > backup.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 用户表密码安全加固
-- 目的: 引入安全的密码哈希存储机制，逐步替换明文/弱加密密码
-- 保留原 password 字段用于平滑迁移，后续版本可移除
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(256) DEFAULT NULL COMMENT '密码哈希值（bcrypt/argon2等）',
  ADD COLUMN IF NOT EXISTS salt VARCHAR(64) DEFAULT NULL COMMENT '密码盐值',
  MODIFY COLUMN password VARCHAR(128) NOT NULL COMMENT '【已废弃】原密码字段，仅用于迁移期兼容';

-- ============================================================
-- 2. 缺失索引补充
-- 目的: 针对高频查询场景补充复合索引与单列索引，降低全表扫描概率
-- ============================================================

-- 2.1 iot_sensor_data 传感器实时数据表
-- 场景: 按记录时间范围查询历史数据（如最近24小时、7天趋势图）
ALTER TABLE iot_sensor_data ADD INDEX IF NOT EXISTS idx_record_time (record_time);

-- 2.2 control_room_command_log 消控室控制命令日志表
-- 场景: 按主机ID+命令时间范围查询某主机的操作历史
ALTER TABLE control_room_command_log ADD INDEX IF NOT EXISTS idx_host_command_time (host_id, command_time);

-- 2.3 control_command_log 远程控制命令日志表
-- 场景: 按主机ID+创建时间范围查询远程控制记录
ALTER TABLE control_command_log ADD INDEX IF NOT EXISTS idx_host_created (host_id, created_at);

-- 2.4 fscn8001_raw_log FSCN8001原始报文日志表
-- 场景: 按设备SN查询某传输装置的报文；按创建时间排序/筛选
ALTER TABLE fscn8001_raw_log ADD INDEX IF NOT EXISTS idx_device_sn (device_sn);
ALTER TABLE fscn8001_raw_log ADD INDEX IF NOT EXISTS idx_created_at (created_at);

-- 2.5 feedback_record 反馈记录表
-- 场景: 按主机ID+反馈类型查询特定类型的反馈记录
ALTER TABLE feedback_record ADD INDEX IF NOT EXISTS idx_host_feedback (host_id, feedback_type);

-- 2.6 users 用户表
-- 场景: 按手机号或邮箱快速查找用户（登录、找回密码、去重校验）
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_phone (phone);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_email (email);

-- 2.7 fscn8001_alarm FSCN8001报警记录表
-- 场景: 按报警时间范围查询；按设备SN查询某传输装置的报警历史
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_alarm_time (alarm_time);
ALTER TABLE fscn8001_alarm ADD INDEX IF NOT EXISTS idx_device_sn (device_sn);

-- ============================================================
-- 3. 时序数据表分区优化（iot_sensor_data）
-- 目的: 传感器数据为典型时序数据，数据量大且按时间范围查询为主。
--       按月范围分区可大幅提升历史数据查询效率，并支持快速清理过期数据。
-- 注意: 
--   - 仅适用于 MySQL 5.7+ / 8.0+
--   - 若表已有数据，需先重建表或使用 ALTER TABLE ... PARTITION BY RANGE
--   - 以下提供两种方案：新建分区表示例 与 现有表改造示例
-- ============================================================

-- 方案A：新建分区表示例（推荐用于新部署或测试环境）
-- DROP TABLE IF EXISTS iot_sensor_data_partitioned;
-- CREATE TABLE iot_sensor_data_partitioned (
--   id            BIGINT PRIMARY KEY AUTO_INCREMENT,
--   sensor_id     BIGINT       NOT NULL COMMENT '传感器ID',
--   sensor_value  DECIMAL(10,3) NOT NULL COMMENT '传感器数值',
--   status        TINYINT      DEFAULT 1 COMMENT '状态：0离线 1正常 2低报警 3高报警 4故障',
--   record_time   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
--   INDEX idx_sensor_time (sensor_id, record_time),
--   INDEX idx_status (status),
--   INDEX idx_record_time (record_time),
--   FOREIGN KEY (sensor_id) REFERENCES iot_sensor(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='传感器实时数据表（按月分区）'
-- PARTITION BY RANGE (UNIX_TIMESTAMP(record_time)) (
--   PARTITION p202601 VALUES LESS THAN (UNIX_TIMESTAMP('2026-02-01 00:00:00')),
--   PARTITION p202602 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01 00:00:00')),
--   PARTITION p202603 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01 00:00:00')),
--   PARTITION p202604 VALUES LESS THAN (UNIX_TIMESTAMP('2026-05-01 00:00:00')),
--   PARTITION p202605 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-01 00:00:00')),
--   PARTITION p202606 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-01 00:00:00')),
--   PARTITION p202607 VALUES LESS THAN (UNIX_TIMESTAMP('2026-08-01 00:00:00')),
--   PARTITION p202608 VALUES LESS THAN (UNIX_TIMESTAMP('2026-09-01 00:00:00')),
--   PARTITION p202609 VALUES LESS THAN (UNIX_TIMESTAMP('2026-10-01 00:00:00')),
--   PARTITION p202610 VALUES LESS THAN (UNIX_TIMESTAMP('2026-11-01 00:00:00')),
--   PARTITION p202611 VALUES LESS THAN (UNIX_TIMESTAMP('2026-12-01 00:00:00')),
--   PARTITION p202612 VALUES LESS THAN (UNIX_TIMESTAMP('2027-01-01 00:00:00')),
--   PARTITION pfuture   VALUES LESS THAN MAXVALUE
-- );

-- 方案B：现有表改造为分区表（MySQL 8.0 支持在线 ALTER）
-- 警告：若 iot_sensor_data 已有大量数据，此操作可能耗时较长，请在低峰期执行
-- ALTER TABLE iot_sensor_data
--   PARTITION BY RANGE (UNIX_TIMESTAMP(record_time)) (
--     PARTITION p202604 VALUES LESS THAN (UNIX_TIMESTAMP('2026-05-01 00:00:00')),
--     PARTITION p202605 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-01 00:00:00')),
--     PARTITION p202606 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-01 00:00:00')),
--     PARTITION pfuture   VALUES LESS THAN MAXVALUE
--   );

-- 分区表维护：添加下个月分区（建议每月初通过定时任务执行）
-- ALTER TABLE iot_sensor_data ADD PARTITION (
--   PARTITION p202701 VALUES LESS THAN (UNIX_TIMESTAMP('2027-02-01 00:00:00'))
-- );

-- ============================================================
-- 4. 日志表 TTL（自动清理）策略
-- 目的: 日志类数据增长迅速，通过事件定时器自动清理过期数据，
--       避免磁盘耗尽并降低备份压力。
-- 前置条件: 确保 MySQL 事件调度器已开启
--           SHOW VARIABLES LIKE 'event_scheduler';
--           SET GLOBAL event_scheduler = ON;
-- ============================================================

-- 开启事件调度器（如未开启）
SET GLOBAL event_scheduler = ON;

-- 4.1 fscn8001_raw_log：保留90天原始报文
DROP EVENT IF EXISTS evt_cleanup_fscn8001_raw_log;
DELIMITER //
CREATE EVENT evt_cleanup_fscn8001_raw_log
  ON SCHEDULE EVERY 1 DAY
  STARTS CURRENT_TIMESTAMP
  DO
  BEGIN
    DELETE FROM fscn8001_raw_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
  END//
DELIMITER ;
ALTER EVENT evt_cleanup_fscn8001_raw_log ENABLE;

-- 4.2 control_command_log：保留365天（1年）远程控制命令日志
DROP EVENT IF EXISTS evt_cleanup_control_command_log;
DELIMITER //
CREATE EVENT evt_cleanup_control_command_log
  ON SCHEDULE EVERY 1 DAY
  STARTS CURRENT_TIMESTAMP
  DO
  BEGIN
    DELETE FROM control_command_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);
  END//
DELIMITER ;
ALTER EVENT evt_cleanup_control_command_log ENABLE;

-- 4.3 gb26875_raw_log：保留90天GB26875原始报文
DROP EVENT IF EXISTS evt_cleanup_gb26875_raw_log;
DELIMITER //
CREATE EVENT evt_cleanup_gb26875_raw_log
  ON SCHEDULE EVERY 1 DAY
  STARTS CURRENT_TIMESTAMP
  DO
  BEGIN
    DELETE FROM gb26875_raw_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
  END//
DELIMITER ;
ALTER EVENT evt_cleanup_gb26875_raw_log ENABLE;

-- ============================================================
-- 5. 性能监控：慢查询日志配置
-- 目的: 捕获执行时间超过阈值的 SQL，用于后续性能调优
-- 注意: 以下配置为会话级演示，生产环境建议在 my.cnf / my.ini 中持久化配置
-- ============================================================

-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';

-- 设置慢查询时间阈值（单位：秒），建议生产环境初始值 1~2 秒
SET GLOBAL long_query_time = 2;

-- 记录未使用索引的查询（可选，开发/测试环境建议开启）
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- 慢查询日志输出方式（FILE 或 TABLE）
-- FILE: 写入文件，便于日志收集系统处理
-- TABLE: 写入 mysql.slow_log，便于 SQL 分析
SET GLOBAL log_output = 'FILE,TABLE';

-- 查看慢查询日志文件路径
-- SHOW VARIABLES LIKE 'slow_query_log_file';

-- ============================================================
-- 6. 字符集统一检查与修复
-- 目的: 确保所有表及字符列使用 utf8mb4，支持完整 Unicode（含 emoji、生僻字），
--       避免字符集不一致导致的比较错误与索引失效。
-- ============================================================

-- 6.1 生成检查脚本：查询非 utf8mb4 的表
-- SELECT 
--   TABLE_NAME,
--   CCSA.CHARACTER_SET_NAME AS TABLE_CHARSET
-- FROM information_schema.TABLES T
-- JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
--   ON T.TABLE_COLLATION = CCSA.COLLATION_NAME
-- WHERE T.TABLE_SCHEMA = DATABASE()
--   AND CCSA.CHARACTER_SET_NAME != 'utf8mb4';

-- 6.2 批量修复：将当前数据库所有表转换为 utf8mb4
-- 以下使用存储过程动态生成并执行 ALTER 语句
DELIMITER //
DROP PROCEDURE IF EXISTS proc_fix_charset//
CREATE PROCEDURE proc_fix_charset()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE t_name VARCHAR(128);
  DECLARE cur CURSOR FOR
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_COLLATION NOT LIKE 'utf8mb4%';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO t_name;
    IF done THEN
      LEAVE read_loop;
    END IF;
    SET @sql = CONCAT('ALTER TABLE `', t_name, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('已修复字符集: ', t_name) AS msg;
  END LOOP;
  CLOSE cur;
END//
DELIMITER ;

-- 执行字符集修复（取消下一行注释以执行）
-- CALL proc_fix_charset();

-- 6.3 关键表显式确认字符集（兜底方案）
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fire_host CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fire_loop CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fire_device CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE iot_sensor CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE iot_sensor_data CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_command_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_room_command_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_room_realtime CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_room_shield CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE control_room_video CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE multiline_panel CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bus_panel CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE shield_record CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE feedback_record CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE host_multiline CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE host_bus_point CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE gb26875_raw_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE gb26875_device CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE gb26875_alarm CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fscn8001_raw_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fscn8001_alarm CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE fscn8001_device CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- 7. 优化后验证
-- ============================================================

-- 7.1 查看 users 表字段
-- SHOW COLUMNS FROM users;

-- 7.2 查看各表索引
-- SHOW INDEX FROM iot_sensor_data;
-- SHOW INDEX FROM control_room_command_log;
-- SHOW INDEX FROM control_command_log;
-- SHOW INDEX FROM fscn8001_raw_log;
-- SHOW INDEX FROM feedback_record;
-- SHOW INDEX FROM users;
-- SHOW INDEX FROM fscn8001_alarm;

-- 7.3 查看已创建的事件
-- SHOW EVENTS;

-- 7.4 查看慢查询配置
-- SHOW VARIABLES LIKE 'slow_query%';
-- SHOW VARIABLES LIKE 'long_query_time';
-- SHOW VARIABLES LIKE 'log_queries_not_using_indexes';

-- 7.5 查看表字符集
-- SELECT 
--   TABLE_NAME,
--   CCSA.CHARACTER_SET_NAME
-- FROM information_schema.TABLES T
-- JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
--   ON T.TABLE_COLLATION = CCSA.COLLATION_NAME
-- WHERE T.TABLE_SCHEMA = DATABASE();

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 脚本执行完毕
-- 建议操作：
-- 1. 在测试环境验证无误后再上生产
-- 2. 大表（如 iot_sensor_data）的 ALTER 操作请在低峰期执行
-- 3. 分区表改造前务必做好数据备份
-- 4. 监控慢查询日志目录磁盘空间
-- ============================================================
