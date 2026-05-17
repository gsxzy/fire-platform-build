-- ============================================================
-- Flyway Migration V043
-- 创建安消联动执行记录表并初始化默认联动规则
-- 源文件: app/sql/linkage_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS linkage_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  record_code VARCHAR(64) NOT NULL COMMENT '记录编号 LK-YYYYMMDDXXXX',
  rule_id BIGINT DEFAULT NULL COMMENT '关联规则ID',
  rule_name VARCHAR(128) DEFAULT NULL COMMENT '规则名称',
  alarm_id BIGINT DEFAULT NULL COMMENT '关联告警ID',
  alarm_event_code VARCHAR(64) DEFAULT NULL COMMENT '告警事件编号',
  alarm_type VARCHAR(32) DEFAULT NULL COMMENT '告警类型 fire/fault/supervisory',
  alarm_level TINYINT DEFAULT 1 COMMENT '告警等级',
  alarm_device_name VARCHAR(128) DEFAULT NULL COMMENT '告警设备名称',
  alarm_location VARCHAR(256) DEFAULT NULL COMMENT '告警位置',
  device_id VARCHAR(64) DEFAULT NULL COMMENT '设备ID',
  org_id VARCHAR(64) DEFAULT NULL COMMENT '单位ID',
  org_name VARCHAR(128) DEFAULT NULL COMMENT '单位名称',
  linkage_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '联动触发时间',
  action_results JSON DEFAULT NULL COMMENT '各动作执行结果',
  overall_status TINYINT DEFAULT 1 COMMENT '整体状态: 1执行中 2全部成功 3部分成功 4全部失败',
  duration_ms INT DEFAULT NULL COMMENT '执行耗时(ms)',
  operator VARCHAR(64) DEFAULT 'system' COMMENT '操作人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rule_id (rule_id),
  INDEX idx_alarm_id (alarm_id),
  INDEX idx_alarm_type (alarm_type),
  INDEX idx_linkage_time (linkage_time),
  INDEX idx_overall_status (overall_status),
  INDEX idx_org_id (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='安消联动执行记录表';

-- 初始化默认联动规则（幂等：IGNORE 已存在记录）
INSERT IGNORE INTO linkage_rules (rule_code, rule_name, rule_type, trigger_condition, linkage_action, effective_time, priority, status, description) VALUES
('RULE-FIRE-001', '火警联动视频确认', 1, '{"alarmTypes":["fire"],"alarmLevels":["high","critical"]}', '{"actions":[{"type":"video","target":"nearest","duration":30,"autoFullscreen":true},{"type":"record","duration":300},{"type":"popup","level":"urgent"},{"type":"notify","channels":["app"],"targets":["duty"]}]}', '{"type":"all"}', 1, 1, '火警发生时自动调取最近摄像头视频、录像并弹窗告警'),
('RULE-FIRE-002', '重点区域批量联动', 1, '{"alarmTypes":["fire"],"alarmLevels":["high","critical"],"locations":["万达广场","兰州中心"]}', '{"actions":[{"type":"video","target":"all","duration":60},{"type":"record","duration":600},{"type":"sound_light","level":"max"},{"type":"broadcast","content":"火警警报，请立即疏散"},{"type":"access_control","action":"release"},{"type":"elevator","action":"forced_stop"},{"type":"notify","channels":["app","sms"],"targets":["duty","manager"]}]}', '{"type":"all"}', 1, 1, '重点单位火警时启动全量联动预案'),
('RULE-FAULT-001', '故障联动视频查看', 2, '{"alarmTypes":["fault"]}', '{"actions":[{"type":"video","target":"nearest","duration":15},{"type":"notify","channels":["app"],"targets":["duty"]}]}', '{"type":"all"}', 2, 1, '设备故障时调取视频查看现场并通知值班人员'),
('RULE-AI-001', 'AI烟火识别联动', 4, '{"alarmTypes":["ai_fire","ai_smoke"]}', '{"actions":[{"type":"video","target":"nearest","duration":60},{"type":"record","duration":300},{"type":"ai","action":"deep_analysis"},{"type":"notify","channels":["app","sms"],"targets":["duty","manager"]}]}', '{"type":"all"}', 1, 1, 'AI识别到烟火时自动录像并推送告警'),
('RULE-WATER-001', '水压液位超低联动', 5, '{"alarmTypes":["water_low","water_empty"]}', '{"actions":[{"type":"video","target":"nearest","duration":30},{"type":"notify","channels":["app"],"targets":["duty","maintenance"]}]}', '{"type":"all"}', 3, 1, '消防水源异常时联动视频并生成维保工单'),
('RULE-ABSENCE-001', '消控室离岗联动', 6, '{"alarmTypes":["duty_absence"]}', '{"actions":[{"type":"video","target":"control_room","duration":30},{"type":"sound_light","level":"normal"},{"type":"notify","channels":["app"],"targets":["duty","manager"]}]}', '{"type":"all"}', 2, 1, '消控室离岗时声光预警并推送通知');
