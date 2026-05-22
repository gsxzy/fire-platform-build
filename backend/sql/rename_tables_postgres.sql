-- ═══════════════════════════════════════════════════════════════
-- PostgreSQL 表命名规范化重命名脚本
-- 执行环境：已完成 PostgreSQL 迁移后的业务库
-- ═══════════════════════════════════════════════════════════════

-- 1. 设备心跳表
ALTER TABLE IF EXISTS dev_heartbeat RENAME TO fire_device_heartbeat;
ALTER TABLE IF EXISTS fire_device_heartbeat RENAME CONSTRAINT dev_heartbeat_pkey TO fire_device_heartbeat_pkey;

-- 2. 摄像头档案表
ALTER TABLE IF EXISTS cameras RENAME TO fire_camera;
ALTER TABLE IF EXISTS fire_camera RENAME CONSTRAINT cameras_pkey TO fire_camera_pkey;

-- 3. 系统待办表
ALTER TABLE IF EXISTS todos RENAME TO sys_todo;
ALTER TABLE IF EXISTS sys_todo RENAME CONSTRAINT todos_pkey TO sys_todo_pkey;

-- 4. 系统公告表
ALTER TABLE IF EXISTS notices RENAME TO sys_notice;
ALTER TABLE IF EXISTS sys_notice RENAME CONSTRAINT notices_pkey TO sys_notice_pkey;

-- 5. 更新相关序列名（PostgreSQL 重命名表后，序列不会自动跟随）
-- 如果主键使用 SERIAL/BIGSERIAL，需要手动重命名序列
-- 示例：ALTER SEQUENCE IF EXISTS todos_id_seq RENAME TO sys_todo_id_seq;

-- 6. 更新外键约束名（如果存在引用这些表的外键）
-- 例如：ALTER TABLE xxx RENAME CONSTRAINT fk_old_name TO fk_new_name;

-- 7. 更新索引名（可选，建议统一）
-- ALTER INDEX IF EXISTS idx_todos_user RENAME TO idx_sys_todo_user;

-- 验证
\dt sys_* fire_* gb* fscn* fire_device_heartbeat
