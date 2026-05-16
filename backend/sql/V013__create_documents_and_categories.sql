-- ============================================================
-- Flyway Migration V013
-- 创建知识库文档表和文档分类表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(256) DEFAULT NULL,
  category VARCHAR(64) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  view_count INT DEFAULT 0,
  attachments JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库文档';

CREATE TABLE IF NOT EXISTS doc_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) DEFAULT NULL,
  parent_id BIGINT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档分类';
