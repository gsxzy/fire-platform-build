-- ═══════════════════════════════════════════════════════════════
-- 消防设备平面图系统 - 数据库表结构
-- 包含：建筑物、楼层、设备点位、摄像头关联
-- ═══════════════════════════════════════════════════════════════

-- 1. fire_building 建筑物表
CREATE TABLE IF NOT EXISTS fire_building (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  unit_id VARCHAR(64) NOT NULL DEFAULT 'PENDING' COMMENT '所属单位ID（关联units或fire_iot_device.unit_id）',
  name VARCHAR(100) NOT NULL COMMENT '建筑名称（如：1号楼/综合楼）',
  type VARCHAR(50) DEFAULT '商业' COMMENT '建筑类型：商业/住宅/工业/医院/学校',
  total_floors INT DEFAULT 1 COMMENT '总层数',
  address VARCHAR(255) DEFAULT '' COMMENT '建筑地址',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='建筑物表';

-- 2. fire_floor 楼层表
CREATE TABLE IF NOT EXISTS fire_floor (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  building_id BIGINT UNSIGNED NOT NULL COMMENT '所属建筑ID',
  name VARCHAR(50) NOT NULL COMMENT '楼层名称（B1/F1/F2/屋顶）',
  floor_number INT NOT NULL DEFAULT 0 COMMENT '楼层号（-1/1/2，用于排序）',
  plan_image_url VARCHAR(255) DEFAULT NULL COMMENT '平面图图片URL',
  plan_width INT DEFAULT 0 COMMENT '图片原始宽度px',
  plan_height INT DEFAULT 0 COMMENT '图片原始高度px',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_building_id (building_id),
  FOREIGN KEY (building_id) REFERENCES fire_building(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='楼层表';

-- 3. fire_floor_device_position 设备点位表（核心）
-- x,y 用百分比0-100，图片缩放时点位自动对齐
CREATE TABLE IF NOT EXISTS fire_floor_device_position (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  floor_id BIGINT UNSIGNED NOT NULL COMMENT '楼层ID',
  device_id VARCHAR(64) NOT NULL COMMENT '设备ID（关联fire_iot_device.device_id或devices.id）',
  x FLOAT NOT NULL DEFAULT 0 COMMENT 'X坐标（百分比0-100）',
  y FLOAT NOT NULL DEFAULT 0 COMMENT 'Y坐标（百分比0-100）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_floor_device (floor_id, device_id),
  INDEX idx_floor_id (floor_id),
  INDEX idx_device_id (device_id),
  FOREIGN KEY (floor_id) REFERENCES fire_floor(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备点位表';

-- 4. fire_floor_camera_binding 摄像头关联表（视频联动用）
CREATE TABLE IF NOT EXISTS fire_floor_camera_binding (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  floor_id BIGINT UNSIGNED NOT NULL COMMENT '楼层ID',
  camera_device_id VARCHAR(64) NOT NULL COMMENT '摄像头设备ID（关联cameras.id或gb28181_devices.id）',
  bound_device_ids JSON DEFAULT NULL COMMENT '关联的消防设备ID数组（如某摄像头看3个烟感）',
  x FLOAT DEFAULT 0 COMMENT '摄像头在图上位置X（百分比）',
  y FLOAT DEFAULT 0 COMMENT '摄像头在图上位置Y（百分比）',
  preset_no INT DEFAULT 0 COMMENT '对应摄像头的预置位号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_floor_id (floor_id),
  INDEX idx_camera_device_id (camera_device_id),
  FOREIGN KEY (floor_id) REFERENCES fire_floor(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='摄像头关联表';
