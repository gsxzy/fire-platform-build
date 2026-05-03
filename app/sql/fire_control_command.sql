-- ═══════════════════════════════════════════════════════════════
-- 设备控制指令表
-- 记录所有下发给设备的控制指令及执行状态
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fire_control_command (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  device_id VARCHAR(64) NOT NULL COMMENT '设备ID（fire_iot_device.device_id）',
  device_name VARCHAR(128) DEFAULT '' COMMENT '设备名称',
  protocol VARCHAR(32) NOT NULL COMMENT '协议类型：gb26875/modbus/mqtt',
  command VARCHAR(64) NOT NULL COMMENT '指令类型：mute/reset/auto/manual/start/stop/test',
  params JSON DEFAULT NULL COMMENT '指令参数',
  status VARCHAR(32) DEFAULT 'pending' COMMENT '状态：pending/success/failed/timeout',
  response TEXT DEFAULT NULL COMMENT '设备回执内容',
  error_msg VARCHAR(512) DEFAULT NULL COMMENT '错误信息',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  responded_at TIMESTAMP NULL DEFAULT NULL COMMENT '收到回执时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_device_id (device_id),
  INDEX idx_status (status),
  INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备控制指令表';
