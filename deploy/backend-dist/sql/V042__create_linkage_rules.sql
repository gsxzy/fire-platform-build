-- ============================================================
-- Flyway Migration V042
-- 创建安消联动规则表
-- 源文件: app/sql/linkage_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS linkage_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rule_code VARCHAR(64) NOT NULL COMMENT '规则编号',
  rule_name VARCHAR(128) NOT NULL COMMENT '规则名称',
  rule_type TINYINT DEFAULT 1 COMMENT '规则类型: 1火警 2故障 3监管 4AI识别 5水压 6离岗',
  trigger_condition JSON NOT NULL COMMENT '触发条件',
  linkage_action JSON NOT NULL COMMENT '联动动作',
  effective_time JSON DEFAULT NULL COMMENT '生效时间',
  priority INT DEFAULT 1 COMMENT '优先级: 1-10',
  status TINYINT DEFAULT 1 COMMENT '状态: 0停用 1启用',
  org_id VARCHAR(64) DEFAULT NULL COMMENT '所属单位ID',
  description VARCHAR(512) DEFAULT NULL COMMENT '规则描述',
  trigger_count INT DEFAULT 0 COMMENT '触发次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rule_code (rule_code),
  INDEX idx_rule_type (rule_type),
  INDEX idx_status (status),
  INDEX idx_org_id (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='安消联动规则表';
