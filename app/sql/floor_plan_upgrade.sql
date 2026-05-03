-- ============================================================
-- 建筑平面图模块升级 - 数据库扩展
-- 支持 CAD 图纸、设备图标化、视频联动
-- ============================================================

-- 1. 扩展 fire_floor 表（支持 CAD 图纸存储）
ALTER TABLE fire_floor
  ADD COLUMN IF NOT EXISTS plan_type VARCHAR(16) DEFAULT 'image' COMMENT '图纸类型: image/cad/svg',
  ADD COLUMN IF NOT EXISTS plan_cad_url VARCHAR(255) DEFAULT NULL COMMENT 'CAD源文件路径',
  ADD COLUMN IF NOT EXISTS plan_cad_data LONGTEXT DEFAULT NULL COMMENT 'CAD解析后的JSON线条数据',
  ADD COLUMN IF NOT EXISTS plan_scale FLOAT DEFAULT 1 COMMENT '图纸比例尺';

-- 2. 扩展 fire_floor_device_position 表（支持状态、视频联动）
ALTER TABLE fire_floor_device_position
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) DEFAULT 'normal' COMMENT '点位状态: normal正常/fault故障/alarm火警/offline离线/shield屏蔽',
  ADD COLUMN IF NOT EXISTS bind_camera_id VARCHAR(64) DEFAULT NULL COMMENT '关联摄像头设备ID',
  ADD COLUMN IF NOT EXISTS bind_camera_channel VARCHAR(32) DEFAULT NULL COMMENT '关联摄像头通道号',
  ADD INDEX idx_status (status);

-- 3. 更新现有点位状态（从 fire_iot_device 同步）
UPDATE fire_floor_device_position p
JOIN fire_iot_device d ON p.device_id = d.device_id
SET p.status = CASE
  WHEN d.status = 'online' THEN 'normal'
  WHEN d.status = 'fault' THEN 'fault'
  WHEN d.status = 'offline' THEN 'offline'
  ELSE 'normal'
END;
