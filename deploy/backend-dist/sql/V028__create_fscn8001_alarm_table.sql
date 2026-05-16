-- ============================================================
-- Flyway Migration V028
-- 创建 FSCN8001 报警记录表
-- 源文件: app/sql/fscn8001_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS fscn8001_alarm (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_sn VARCHAR(64) NOT NULL COMMENT '设备序列号',
  host_code VARCHAR(64) DEFAULT NULL COMMENT '主机编码',
  loop_no INT DEFAULT NULL COMMENT '回路号',
  address INT DEFAULT NULL COMMENT '设备地址',
  device_type VARCHAR(64) DEFAULT NULL COMMENT '设备类型',
  alarm_type VARCHAR(32) DEFAULT NULL COMMENT '报警类型 fire/fault/supervisory',
  alarm_level VARCHAR(32) DEFAULT NULL COMMENT '报警级别 high/normal/low',
  location VARCHAR(256) DEFAULT NULL COMMENT '位置',
  status TINYINT DEFAULT 0 COMMENT '0未处理 1已确认 2已处理',
  alarm_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '报警时间',
  recover_time TIMESTAMP DEFAULT NULL COMMENT '恢复时间',
  INDEX idx_device_sn (device_sn),
  INDEX idx_alarm_time (alarm_time),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='FSCN8001报警记录表';
