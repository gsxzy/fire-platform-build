-- ============================================================
-- Flyway Migration V025
-- 创建监控日志、视频通道、待办、公告、组织架构表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS monitor_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  log_type VARCHAR(32) DEFAULT NULL,
  module VARCHAR(64) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  level VARCHAR(16) DEFAULT 'info',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监控日志';

CREATE TABLE IF NOT EXISTS video_channels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  channel_name VARCHAR(128) DEFAULT NULL,
  camera_id VARCHAR(64) DEFAULT NULL,
  stream_url VARCHAR(512) DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_camera_id (camera_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='视频通道';

CREATE TABLE IF NOT EXISTS todos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(256) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  priority INT DEFAULT 1,
  status INT DEFAULT 0,
  user_id VARCHAR(64) DEFAULT NULL,
  due_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='待办';

CREATE TABLE IF NOT EXISTS notices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(256) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  type VARCHAR(32) DEFAULT 'system',
  priority INT DEFAULT 1,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告';

CREATE TABLE IF NOT EXISTS departments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) DEFAULT NULL,
  parent_id BIGINT DEFAULT 0,
  leader VARCHAR(64) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组织架构';
