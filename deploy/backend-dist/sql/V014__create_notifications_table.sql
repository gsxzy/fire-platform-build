-- ============================================================
-- Flyway Migration V014
-- 创建通知表 (notifications)
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(256) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  type VARCHAR(32) DEFAULT 'system',
  recipient_id VARCHAR(64) DEFAULT NULL,
  is_read TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recipient (recipient_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知';
