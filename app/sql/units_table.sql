-- ═══════════════════════════════════════════════════════════════
-- 单位表
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(64) PRIMARY KEY COMMENT '单位ID',
  name VARCHAR(128) NOT NULL COMMENT '单位名称',
  type VARCHAR(50) DEFAULT '商业' COMMENT '单位类型：商业/住宅/工业/医院/学校',
  address VARCHAR(255) DEFAULT '' COMMENT '单位地址',
  contact_name VARCHAR(64) DEFAULT '' COMMENT '联系人',
  contact_phone VARCHAR(32) DEFAULT '' COMMENT '联系电话',
  status TINYINT DEFAULT 1 COMMENT '0=禁用 1=启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单位表';

-- 插入演示单位（与现有 fire_building 数据关联）
INSERT INTO units (id, name, type, address) VALUES
('UNIT_DEMO_001', '万达广场', '商业', '中山路168号')
ON DUPLICATE KEY UPDATE name='万达广场';
