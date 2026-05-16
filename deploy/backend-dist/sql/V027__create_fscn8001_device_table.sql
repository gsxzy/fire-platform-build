-- ============================================================
-- Flyway Migration V027
-- 创建 FSCN8001 传输装置表
-- 源文件: app/sql/fscn8001_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS fscn8001_device (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_sn VARCHAR(64) NOT NULL UNIQUE COMMENT '设备序列号',
  device_name VARCHAR(128) DEFAULT NULL COMMENT '设备名称',
  ip VARCHAR(32) DEFAULT NULL COMMENT 'IP地址',
  port INT DEFAULT NULL COMMENT '端口',
  status TINYINT DEFAULT 1 COMMENT '0离线 1在线 2故障',
  last_heartbeat TIMESTAMP DEFAULT NULL COMMENT '最后心跳时间',
  login_time TIMESTAMP DEFAULT NULL COMMENT '登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_device_sn (device_sn),
  INDEX idx_status (status),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='FSCN8001传输装置表';
