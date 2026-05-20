-- ============================================================
-- Flyway Migration V063
-- 值守中心模块完善 — 班次定义、交接班记录、值班日志扩展、接警处置扩展
-- 兼容 MySQL 5.7 + 8.0（使用存储过程安全添加）
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS SafeAddColumn$$
CREATE PROCEDURE SafeAddColumn(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_def VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_col, ' ', p_def);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Added column ', p_col, ' to ', p_table) AS result;
  END IF;
END$$

DROP PROCEDURE IF EXISTS SafeAddIndex$$
CREATE PROCEDURE SafeAddIndex(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD INDEX ', p_index, ' (', p_cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Added index ', p_index, ' on ', p_table) AS result;
  END IF;
END$$

DELIMITER ;

-- ============================================================
-- 1. 新建班次定义表 fire_duty_shift
-- ============================================================

CREATE TABLE IF NOT EXISTS fire_duty_shift (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  shift_name VARCHAR(50) NOT NULL COMMENT '班次名称',
  start_time TIME NOT NULL COMMENT '开始时间',
  end_time TIME NOT NULL COMMENT '结束时间',
  rotation_type TINYINT DEFAULT 1 COMMENT '轮班类型：1固定 2轮班 3临时',
  sort_order TINYINT DEFAULT 0 COMMENT '排序',
  description TEXT COMMENT '描述',
  status TINYINT DEFAULT 1 COMMENT '0停用 1启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班次定义表';

-- ============================================================
-- 2. 新建交接班记录表 fire_duty_handover
-- ============================================================

CREATE TABLE IF NOT EXISTS fire_duty_handover (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  handover_no VARCHAR(50) COMMENT '交接班编号',
  schedule_id BIGINT UNSIGNED COMMENT '排班ID',
  shift_id BIGINT UNSIGNED COMMENT '班次ID',
  shift_name VARCHAR(50) COMMENT '班次名称',
  from_user_id BIGINT UNSIGNED COMMENT '交班人ID',
  from_user_name VARCHAR(50) COMMENT '交班人姓名',
  to_user_id BIGINT UNSIGNED COMMENT '接班人ID',
  to_user_name VARCHAR(50) COMMENT '接班人姓名',
  handover_time DATETIME COMMENT '交接时间',
  accept_time DATETIME COMMENT '确认时间',
  pending_alarm_count INT DEFAULT 0 COMMENT '未处置告警数',
  pending_workorder_count INT DEFAULT 0 COMMENT '待办工单数',
  abnormal_device_count INT DEFAULT 0 COMMENT '异常设备数',
  handover_items TEXT COMMENT '交接事项JSON',
  focus_items TEXT COMMENT '重点关注事项',
  equipment_status TEXT COMMENT '设备状态摘要',
  from_signature VARCHAR(255) COMMENT '交班人电子签名',
  to_signature VARCHAR(255) COMMENT '接班人电子签名',
  status TINYINT DEFAULT 0 COMMENT '0待确认 1已确认',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_schedule_id (schedule_id),
  INDEX idx_from_user (from_user_id),
  INDEX idx_to_user (to_user_id),
  INDEX idx_handover_time (handover_time),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交接班记录表';

-- ============================================================
-- 3. 扩展值班排班表 fire_duty_schedule
-- ============================================================

CALL SafeAddColumn('fire_duty_schedule', 'shift_id', 'BIGINT UNSIGNED COMMENT "关联班次定义ID"');
CALL SafeAddColumn('fire_duty_schedule', 'shift_name', 'VARCHAR(50) COMMENT "班次名称冗余"');
CALL SafeAddColumn('fire_duty_schedule', 'remark', 'VARCHAR(500) COMMENT "备注"');

CALL SafeAddIndex('fire_duty_schedule', 'idx_shift_id', 'shift_id');

-- ============================================================
-- 4. 扩展值班日志表 fire_duty_log
-- ============================================================

CALL SafeAddColumn('fire_duty_log', 'log_no', 'VARCHAR(50) COMMENT "日志编号"');
CALL SafeAddColumn('fire_duty_log', 'schedule_id', 'BIGINT UNSIGNED COMMENT "排班ID"');
CALL SafeAddColumn('fire_duty_log', 'event_type', 'TINYINT DEFAULT 1 COMMENT "1系统自动 2手动记录"');
CALL SafeAddColumn('fire_duty_log', 'event_source', 'VARCHAR(50) COMMENT "事件来源：alarm/disposal/patrol/manual"');
CALL SafeAddColumn('fire_duty_log', 'source_id', 'BIGINT UNSIGNED COMMENT "来源记录ID"');
CALL SafeAddColumn('fire_duty_log', 'content', 'TEXT COMMENT "事件内容"');
CALL SafeAddColumn('fire_duty_log', 'attachments', 'TEXT COMMENT "附件JSON"');

CALL SafeAddIndex('fire_duty_log', 'idx_schedule_id', 'schedule_id');
CALL SafeAddIndex('fire_duty_log', 'idx_event_type', 'event_type');
CALL SafeAddIndex('fire_duty_log', 'idx_created_at', 'created_at');

-- ============================================================
-- 5. 扩展接警处置表 dispatch_record
-- ============================================================

CALL SafeAddColumn('dispatch_record', 'alarm_type', 'TINYINT COMMENT "告警类型：1火警 2故障 3监管 4其他"');
CALL SafeAddColumn('dispatch_record', 'alarm_level', 'TINYINT DEFAULT 1 COMMENT "1一般 2严重 3紧急"');
CALL SafeAddColumn('dispatch_record', 'original_handler_id', 'BIGINT UNSIGNED COMMENT "原处置人ID"');
CALL SafeAddColumn('dispatch_record', 'original_handler_name', 'VARCHAR(50) COMMENT "原处置人姓名"');
CALL SafeAddColumn('dispatch_record', 'due_time', 'DATETIME COMMENT "处置截止时间"');
CALL SafeAddColumn('dispatch_record', 'overdue_time', 'DATETIME COMMENT "超时时间"');
CALL SafeAddColumn('dispatch_record', 'escalation_count', 'TINYINT DEFAULT 0 COMMENT "升级次数"');
CALL SafeAddColumn('dispatch_record', 'device_type', 'VARCHAR(50) COMMENT "设备类型"');
CALL SafeAddColumn('dispatch_record', 'point_name', 'VARCHAR(100) COMMENT "点位名称"');
CALL SafeAddColumn('dispatch_record', 'notify_channels', 'TEXT COMMENT "通知渠道JSON"');
CALL SafeAddColumn('dispatch_record', 'push_status', 'TINYINT DEFAULT 0 COMMENT "0未推送 1已推送 2推送失败"');

CALL SafeAddIndex('dispatch_record', 'idx_alarm_type', 'alarm_type');
CALL SafeAddIndex('dispatch_record', 'idx_due_time', 'due_time');

-- ============================================================
-- 6. 初始化默认班次数据
-- ============================================================

INSERT IGNORE INTO fire_duty_shift (shift_name, start_time, end_time, rotation_type, sort_order, description, status)
VALUES
  ('早班', '08:00:00', '16:00:00', 1, 1, '08:00-16:00 白班值守', 1),
  ('中班', '16:00:00', '00:00:00', 1, 2, '16:00-00:00 中班值守', 1),
  ('晚班', '00:00:00', '08:00:00', 1, 3, '00:00-08:00 夜班值守', 1);

-- 清理临时存储过程
DROP PROCEDURE IF EXISTS SafeAddColumn;
DROP PROCEDURE IF EXISTS SafeAddIndex;

SET FOREIGN_KEY_CHECKS = 1;
