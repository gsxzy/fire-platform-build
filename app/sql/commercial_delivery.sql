-- ═══════════════════════════════════════════════════════════════
-- 新致远智慧消防平台 - 商用交付数据库优化脚本
-- 执行前请备份数据库！
-- 适用版本：v2.0.0
-- ═══════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. 设备档案表补充外键约束
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- devices 表外键
ALTER TABLE devices
  ADD CONSTRAINT fk_devices_unit_id
    FOREIGN KEY (unit_id) REFERENCES units(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- iot_devices 表外键
ALTER TABLE iot_devices
  ADD CONSTRAINT fk_iot_devices_unit_id
    FOREIGN KEY (unit_id) REFERENCES units(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- cameras 表外键
ALTER TABLE cameras
  ADD CONSTRAINT fk_cameras_unit_id
    FOREIGN KEY (unit_id) REFERENCES units(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- gb28181_devices 表外键
ALTER TABLE gb28181_devices
  ADD CONSTRAINT fk_gb28181_devices_unit_id
    FOREIGN KEY (unit_id) REFERENCES units(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. 高频查询表补充索引
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- alarms 告警表索引
CREATE INDEX idx_alarms_status_type ON alarms(status, type);
CREATE INDEX idx_alarms_created_at ON alarms(created_at);
CREATE INDEX idx_alarms_unit_id ON alarms(unit_id);

-- work_orders 工单表索引
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);

-- patrol_records 巡检记录索引
CREATE INDEX idx_patrol_records_plan_id ON patrol_records(plan_id);
CREATE INDEX idx_patrol_records_status ON patrol_records(status);

-- hazards 隐患表索引
CREATE INDEX idx_hazards_status ON hazards(status);
CREATE INDEX idx_hazards_level ON hazards(level);

-- control_room_realtime 消控室实时状态索引
CREATE INDEX idx_control_room_host_id ON control_room_realtime(host_id);

-- feedback_record 反馈记录索引
CREATE INDEX idx_feedback_host_point ON feedback_record(host_id, loop_no, point_no);

-- control_command_log 命令日志索引
CREATE INDEX idx_command_log_host ON control_command_log(host_id, created_at);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. 用户表密码安全升级
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 确保 users 表有 password_hash 字段（兼容旧版升级）
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL AFTER password;

-- 将已有 bcrypt 密码迁移到 password_hash（如果 password 字段已是 bcrypt 哈希）
-- UPDATE users SET password_hash = password WHERE password LIKE '$2a$%' OR password LIKE '$2b$%';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. 统一字符集与排序规则
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER DATABASE fire_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. 关键表添加更新时间触发器（如缺失）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DELIMITER //

CREATE TRIGGER IF NOT EXISTS tr_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS iot_devices_updated_at
  BEFORE UPDATE ON iot_devices
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS cameras_updated_at
  BEFORE UPDATE ON cameras
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. 验证：检查外键和索引是否创建成功
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
  TABLE_NAME,
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;
