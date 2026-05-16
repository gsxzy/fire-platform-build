-- ============================================================
-- Flyway Migration V019
-- 创建报表模板表、大屏配置表和大屏组件表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS report_templates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_name VARCHAR(128) DEFAULT NULL,
  template_type VARCHAR(32) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报表模板';

CREATE TABLE IF NOT EXISTS screen_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  screen_name VARCHAR(128) DEFAULT NULL,
  config JSON DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大屏配置';

CREATE TABLE IF NOT EXISTS screen_widgets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  screen_id BIGINT DEFAULT NULL,
  widget_type VARCHAR(32) DEFAULT NULL,
  config JSON DEFAULT NULL,
  position JSON DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_screen_id (screen_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大屏组件';
