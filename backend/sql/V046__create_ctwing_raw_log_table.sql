-- ═══════════════════════════════════════════════════════════════════
-- Flyway Migration V046
-- ISNB 协议集成：CTWing 原始推送日志表
-- 来源：backend/sql/deploy_isnb_20260515.sql 拆分
-- 依赖：无（独立表）
-- 幂等性：CREATE TABLE IF NOT EXISTS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ctwing_raw_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(100) NOT NULL,
  msg_type VARCHAR(32) DEFAULT NULL,
  raw_json JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_id (device_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CTWing原始推送日志';
