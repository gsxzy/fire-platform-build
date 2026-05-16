-- ============================================================
-- Flyway Migration V011
-- 创建演练记录表和演练参与人员表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS drills (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  drill_no VARCHAR(64) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  unit_name VARCHAR(128) DEFAULT NULL,
  drill_date DATE DEFAULT NULL,
  drill_type VARCHAR(64) DEFAULT NULL,
  participants INT DEFAULT 0,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='演练记录';

CREATE TABLE IF NOT EXISTS drill_participants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  drill_id BIGINT DEFAULT NULL,
  name VARCHAR(64) DEFAULT NULL,
  role VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_drill_id (drill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='演练参与人员';
