USE fire_platform;

-- ========================================================
-- FSCN8001 传输装置表
-- ========================================================
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

-- ========================================================
-- FSCN8001 报警记录表
-- ========================================================
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

-- ========================================================
-- FSCN8001 原始报文日志表
-- ========================================================
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
