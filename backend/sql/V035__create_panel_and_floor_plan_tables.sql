-- ============================================================
-- Flyway Migration V035
-- 创建多线盘控制表、总线盘控制表和消防平面图相关表
-- 源文件: app/sql/control_room_backend.sql + app/sql/floor_plan_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS multiline_panel (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  point_no      INT          NOT NULL COMMENT '点位号',
  point_name    VARCHAR(64)  NOT NULL COMMENT '点位名称',
  device_type   VARCHAR(64)  DEFAULT NULL COMMENT '设备类型',
  status        TINYINT      DEFAULT 0 COMMENT '状态：0停止 1启动 2故障',
  feedback_status TINYINT    DEFAULT 0 COMMENT '反馈状态：0无 1有',
  fault_status  TINYINT      DEFAULT 0 COMMENT '故障状态：0无 1有',
  location      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  sort_order    INT          DEFAULT 0 COMMENT '排序',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_point (host_id, point_no),
  INDEX idx_status (status),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='多线盘控制表';

CREATE TABLE IF NOT EXISTS bus_panel (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  loop_no       INT          NOT NULL COMMENT '回路号',
  point_no      INT          NOT NULL COMMENT '点位号',
  point_name    VARCHAR(64)  NOT NULL COMMENT '点位名称',
  device_type   VARCHAR(64)  DEFAULT NULL COMMENT '设备类型',
  install_location VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  status        TINYINT      DEFAULT 0 COMMENT '状态：0正常 1火警 2故障 3屏蔽',
  feedback_status TINYINT    DEFAULT 0 COMMENT '反馈状态：0无 1有',
  sort_order    INT          DEFAULT 0 COMMENT '排序',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_loop_point (host_id, loop_no, point_no),
  INDEX idx_status (status),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='总线盘控制表';

-- 消防平面图相关表
CREATE TABLE IF NOT EXISTS fire_building (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  unit_id VARCHAR(64) NOT NULL DEFAULT 'PENDING' COMMENT '所属单位ID',
  name VARCHAR(100) NOT NULL COMMENT '建筑名称',
  type VARCHAR(50) DEFAULT '商业' COMMENT '建筑类型：商业/住宅/工业/医院/学校',
  total_floors INT DEFAULT 1 COMMENT '总层数',
  address VARCHAR(255) DEFAULT '' COMMENT '建筑地址',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='建筑物表';

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

CREATE TABLE IF NOT EXISTS fire_floor_device_position (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  floor_id BIGINT UNSIGNED NOT NULL COMMENT '楼层ID',
  device_id VARCHAR(64) NOT NULL COMMENT '设备ID',
  x FLOAT NOT NULL DEFAULT 0 COMMENT 'X坐标（百分比0-100）',
  y FLOAT NOT NULL DEFAULT 0 COMMENT 'Y坐标（百分比0-100）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_floor_device (floor_id, device_id),
  INDEX idx_floor_id (floor_id),
  INDEX idx_device_id (device_id),
  FOREIGN KEY (floor_id) REFERENCES fire_floor(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备点位表';

CREATE TABLE IF NOT EXISTS fire_floor_camera_binding (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  floor_id BIGINT UNSIGNED NOT NULL COMMENT '楼层ID',
  camera_device_id VARCHAR(64) NOT NULL COMMENT '摄像头设备ID',
  bound_device_ids JSON DEFAULT NULL COMMENT '关联的消防设备ID数组',
  x FLOAT DEFAULT 0 COMMENT '摄像头在图上位置X（百分比）',
  y FLOAT DEFAULT 0 COMMENT '摄像头在图上位置Y（百分比）',
  preset_no INT DEFAULT 0 COMMENT '对应摄像头的预置位号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_floor_id (floor_id),
  INDEX idx_camera_device_id (camera_device_id),
  FOREIGN KEY (floor_id) REFERENCES fire_floor(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='摄像头关联表';
