-- ============================================================
-- Flyway Migration V029
-- 创建 FSCN8001 原始报文日志表
-- 源文件: app/sql/fscn8001_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS fscn8001_raw_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_sn VARCHAR(64) NOT NULL COMMENT '设备序列号',
  direction VARCHAR(16) DEFAULT 'RX' COMMENT '方向 RX/TX',
  cmd_type VARCHAR(32) DEFAULT NULL COMMENT '命令类型',
  hex_data TEXT COMMENT '十六进制原始数据',
  parsed_json TEXT COMMENT '解析后的JSON',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_sn (device_sn),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='FSCN8001原始报文日志表';
