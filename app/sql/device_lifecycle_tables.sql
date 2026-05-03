-- ============================================================
-- 设备生命周期管理表结构（档案→分配→接入三步流程）
-- 版本: v3.0
-- 说明:
--   1. 扩展 device_archive 表，新增 archive_status 流程状态字段
--   2. 新建 device_access（设备接入管理）
--   3. 新建 device_allocation_log（设备分配记录）
--   4. 迁移脚本：将现有数据映射到新状态体系
-- ============================================================

-- --------------------------------------------------------
-- 1. 扩展 device_archive 表：增加档案流程状态
-- --------------------------------------------------------
-- 兼容旧版 MySQL（移除 IF NOT EXISTS）
ALTER TABLE device_archive
  ADD COLUMN archive_status VARCHAR(16) DEFAULT 'unallocated' COMMENT '档案流程状态: unallocated未分配/allocated已分配/accessed已接入/scrapped报废',
  ADD COLUMN calibration_cycle INT DEFAULT 12 COMMENT '校准周期(月)',
  ADD COLUMN scrap_year INT DEFAULT 10 COMMENT '报废年限(年)',
  ADD COLUMN created_by VARCHAR(64) DEFAULT NULL COMMENT '录入人',
  ADD COLUMN remark TEXT DEFAULT NULL COMMENT '备注';

-- 若原表无 archive_status，则根据现有数据自动迁移
UPDATE device_archive SET archive_status = 'scrapped' WHERE status = 'scrapped';
UPDATE device_archive SET archive_status = 'unallocated' WHERE archive_status IS NULL OR archive_status = '' AND (unit_id IS NULL OR unit_id = '');
UPDATE device_archive SET archive_status = 'allocated' WHERE archive_status IS NULL OR archive_status = '' AND unit_id IS NOT NULL AND (protocol_device_id IS NULL OR protocol_device_id = '');
UPDATE device_archive SET archive_status = 'accessed' WHERE archive_status IS NULL OR archive_status = '' AND unit_id IS NOT NULL AND protocol_device_id IS NOT NULL AND protocol_device_id != '';

-- 确保索引
ALTER TABLE device_archive ADD INDEX idx_archive_status (archive_status);

-- --------------------------------------------------------
-- 2. 设备接入管理表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_access (
  id VARCHAR(32) PRIMARY KEY COMMENT '接入ID',
  device_id VARCHAR(32) NOT NULL COMMENT '设备档案ID',
  unit_id VARCHAR(32) NOT NULL COMMENT '所属单位ID',
  gateway_no VARCHAR(64) DEFAULT NULL COMMENT '网关编号',
  protocol VARCHAR(32) NOT NULL COMMENT '通信协议: gb26875/modbus/mqtt/nbiot/gb28181/tcp/lora',
  access_address VARCHAR(128) DEFAULT NULL COMMENT '接入地址/IP',
  port INT DEFAULT NULL COMMENT '端口号',
  heartbeat_interval INT DEFAULT 60 COMMENT '心跳间隔(秒)',
  encrypt_type VARCHAR(32) DEFAULT NULL COMMENT '加密方式',
  access_status VARCHAR(16) DEFAULT 'disconnected' COMMENT '接入状态: disconnected未接入/connecting接入中/connected已接入/failed接入失败',
  config_json JSON DEFAULT NULL COMMENT '扩展配置参数',
  last_test_time DATETIME DEFAULT NULL COMMENT '最后测试时间',
  last_test_result VARCHAR(16) DEFAULT NULL COMMENT '最后测试结果: success/failed',
  fail_reason VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
  created_by VARCHAR(64) DEFAULT NULL COMMENT '创建人',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_device_id (device_id),
  INDEX idx_unit_id (unit_id),
  INDEX idx_access_status (access_status),
  INDEX idx_protocol (protocol),
  FOREIGN KEY (device_id) REFERENCES device_archive(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备接入管理';

-- --------------------------------------------------------
-- 3. 设备分配记录表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_allocation_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(32) NOT NULL COMMENT '设备档案ID',
  unit_id VARCHAR(32) NOT NULL COMMENT '分配到的单位ID',
  building_id VARCHAR(32) DEFAULT NULL COMMENT '建筑ID',
  floor_id VARCHAR(32) DEFAULT NULL COMMENT '楼层ID',
  point_id VARCHAR(32) DEFAULT NULL COMMENT '点位ID',
  action VARCHAR(16) NOT NULL COMMENT '操作: allocate分配/unallocate解除分配/reallocate变更单位',
  operator VARCHAR(64) DEFAULT NULL COMMENT '操作人',
  remark VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_id (device_id),
  INDEX idx_unit_id (unit_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (device_id) REFERENCES device_archive(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备分配记录';

-- --------------------------------------------------------
-- 4. 接入日志表（记录接入、断开、失败等操作日志）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_access_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(32) NOT NULL COMMENT '设备档案ID',
  access_id VARCHAR(32) NOT NULL COMMENT '接入记录ID',
  action VARCHAR(16) NOT NULL COMMENT '操作: connect接入/disconnect断开/test测试/reconfig重新配置',
  access_params JSON DEFAULT NULL COMMENT '接入参数快照',
  result VARCHAR(16) DEFAULT NULL COMMENT '结果: success/failed',
  fail_reason VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
  operator VARCHAR(64) DEFAULT NULL COMMENT '操作人',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_id (device_id),
  INDEX idx_access_id (access_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (device_id) REFERENCES device_archive(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备接入日志';

-- --------------------------------------------------------
-- 5. 迁移脚本：为已有 unit_id 的设备生成分配记录
-- --------------------------------------------------------
INSERT IGNORE INTO device_allocation_log (device_id, unit_id, building_id, floor_id, action, remark)
SELECT 
  id as device_id,
  unit_id,
  building_id,
  floor_id,
  'allocate' as action,
  '系统升级：历史数据迁移' as remark
FROM device_archive
WHERE unit_id IS NOT NULL AND unit_id != '';

-- --------------------------------------------------------
-- 6. 迁移脚本：为已有 protocol_device_id 的设备生成接入记录
-- --------------------------------------------------------
INSERT IGNORE INTO device_access (id, device_id, unit_id, protocol, access_address, port, access_status, created_at)
SELECT 
  CONCAT('ACC_', SUBSTRING(MD5(CONCAT(da.id, da.protocol_type)), 1, 8)) as id,
  da.id as device_id,
  da.unit_id,
  da.protocol_type as protocol,
  da.ip as access_address,
  da.port,
  'connected' as access_status,
  da.created_at
FROM device_archive da
WHERE da.protocol_device_id IS NOT NULL AND da.protocol_device_id != '' AND da.unit_id IS NOT NULL AND da.unit_id != '';
