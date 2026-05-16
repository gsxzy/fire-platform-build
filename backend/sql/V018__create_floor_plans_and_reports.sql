-- ============================================================
-- Flyway Migration V018
-- 创建建筑平面图表和报表表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS floor_plans (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  building_id VARCHAR(64) DEFAULT NULL,
  floor_id VARCHAR(64) DEFAULT NULL,
  name VARCHAR(128) DEFAULT NULL,
  image_url VARCHAR(512) DEFAULT NULL,
  scale DECIMAL(10,4) DEFAULT 1,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_building_id (building_id),
  INDEX idx_floor_id (floor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='建筑平面图';

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  report_name VARCHAR(128) DEFAULT NULL,
  report_type VARCHAR(32) DEFAULT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  params JSON DEFAULT NULL,
  file_url VARCHAR(512) DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报表';
