-- ============================================================
-- 单位管理与设备管理核心表结构
-- 版本: v2.0
-- 说明:
--   1. 扩展 units 表（兼容现有字段）
--   2. 新建 device_archive（设备档案总台账）
--   3. 新建 device_config（设备配置）
--   4. 新建 device_maintenance（设备维护）
--   5. 新建 unit_personnel（单位人员/责任体系）
-- ============================================================

-- --------------------------------------------------------
-- 1. 扩展 units 表
-- --------------------------------------------------------
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(64) DEFAULT NULL COMMENT '联系人姓名',
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20) DEFAULT NULL COMMENT '联系人电话',
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(64) DEFAULT NULL COMMENT '联系人邮箱',
  ADD COLUMN IF NOT EXISTS legal_person VARCHAR(64) DEFAULT NULL COMMENT '法人姓名',
  ADD COLUMN IF NOT EXISTS license_no VARCHAR(64) DEFAULT NULL COMMENT '统一社会信用代码',
  ADD COLUMN IF NOT EXISTS area DECIMAL(10,2) DEFAULT NULL COMMENT '占地面积(㎡)',
  ADD COLUMN IF NOT EXISTS lng DECIMAL(10,7) DEFAULT NULL COMMENT '经度',
  ADD COLUMN IF NOT EXISTS lat DECIMAL(10,7) DEFAULT NULL COMMENT '纬度',
  ADD COLUMN IF NOT EXISTS risk_level VARCHAR(16) DEFAULT 'low' COMMENT '风险等级: low/medium/high',
  ADD COLUMN IF NOT EXISTS supervision_level VARCHAR(16) DEFAULT 'general' COMMENT '监管等级: general/key/nine-small',
  ADD COLUMN IF NOT EXISTS parent_id VARCHAR(32) DEFAULT NULL COMMENT '上级单位ID（集团场景）',
  ADD COLUMN IF NOT EXISTS remark TEXT DEFAULT NULL COMMENT '备注',
  ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 确保 supervision_level 与 type 同步（一般单位/重点单位/九小场所）
UPDATE units SET supervision_level = type WHERE supervision_level IS NULL OR supervision_level = '';

-- --------------------------------------------------------
-- 2. 设备档案总台账（一物一码）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_archive (
  id VARCHAR(32) PRIMARY KEY COMMENT '平台统一设备ID（如 UUID）',
  code VARCHAR(64) UNIQUE NOT NULL COMMENT '设备编码（一物一码）',
  name VARCHAR(128) NOT NULL COMMENT '设备名称',
  category VARCHAR(32) NOT NULL COMMENT '设备类别：detector烟感/button手报/pump消防泵/fan风机/camera摄像头/host报警主机/elec-monitor电气监测/water水源/pressure-sensor压力/level-sensor液位/lighting应急照明/broadcast广播/elevator电梯/controller控制器',
  sub_category VARCHAR(32) DEFAULT NULL COMMENT '子类别',
  manufacturer VARCHAR(64) DEFAULT NULL COMMENT '制造商',
  model VARCHAR(64) DEFAULT NULL COMMENT '型号',
  serial_no VARCHAR(64) DEFAULT NULL COMMENT '出厂序列号',
  production_date DATE DEFAULT NULL COMMENT '生产日期',
  install_date DATE DEFAULT NULL COMMENT '安装日期',
  expire_date DATE DEFAULT NULL COMMENT '有效期至',
  unit_id VARCHAR(32) DEFAULT NULL COMMENT '所属单位',
  building_id VARCHAR(32) DEFAULT NULL COMMENT '所属建筑',
  floor_id VARCHAR(32) DEFAULT NULL COMMENT '所属楼层',
  area VARCHAR(64) DEFAULT NULL COMMENT '区域/位置描述',
  lng DECIMAL(10,7) DEFAULT NULL COMMENT '经度',
  lat DECIMAL(10,7) DEFAULT NULL COMMENT '纬度',
  protocol_type VARCHAR(16) DEFAULT NULL COMMENT '协议类型：gb26875/modbus/mqtt/nbiot/gb28181/tcp',
  protocol_device_id VARCHAR(64) DEFAULT NULL COMMENT '关联协议层设备ID（fire_iot_device.device_id）',
  ip VARCHAR(64) DEFAULT NULL COMMENT 'IP地址',
  port INT DEFAULT NULL COMMENT '端口号',
  status VARCHAR(16) DEFAULT 'normal' COMMENT '运行状态：normal在用/fault故障/maintenance维护/offline离线/disabled禁用/scrapped报废',
  archive_status VARCHAR(16) DEFAULT 'unallocated' COMMENT '档案流程状态：unallocated未分配/allocated已分配/accessed已接入/scrapped报废',
  calibration_cycle INT DEFAULT 12 COMMENT '校准周期(月)',
  scrap_year INT DEFAULT 10 COMMENT '报废年限(年)',
  health_score INT DEFAULT 100 COMMENT '设备健康度 0-100',
  created_by VARCHAR(64) DEFAULT NULL COMMENT '录入人',
  remark TEXT DEFAULT NULL COMMENT '备注',
  qr_code VARCHAR(255) DEFAULT NULL COMMENT '一物一码二维码URL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id),
  INDEX idx_building_id (building_id),
  INDEX idx_floor_id (floor_id),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_archive_status (archive_status),
  INDEX idx_protocol_device (protocol_device_id),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (building_id) REFERENCES fire_building(id) ON DELETE SET NULL,
  FOREIGN KEY (floor_id) REFERENCES fire_floor(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备档案总台账（一物一码）';

-- --------------------------------------------------------
-- 3. 设备配置
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(32) NOT NULL COMMENT '关联设备档案ID',
  protocol_type VARCHAR(16) DEFAULT NULL COMMENT '协议类型',
  communication_params JSON DEFAULT NULL COMMENT '通信参数：IP/端口/寄存器地址/MQTT主题等',
  alarm_thresholds JSON DEFAULT NULL COMMENT '告警阈值配置',
  linkage_rules JSON DEFAULT NULL COMMENT '联动规则',
  heartbeat_interval INT DEFAULT 60 COMMENT '心跳间隔秒',
  data_collection_interval INT DEFAULT 300 COMMENT '数据采集间隔秒',
  auto_report TINYINT(1) DEFAULT 1 COMMENT '是否自动上报',
  mute_enabled TINYINT(1) DEFAULT 1 COMMENT '是否允许消音',
  reset_enabled TINYINT(1) DEFAULT 1 COMMENT '是否允许复位',
  remote_control_enabled TINYINT(1) DEFAULT 0 COMMENT '是否允许远程控制',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_device_id (device_id),
  FOREIGN KEY (device_id) REFERENCES device_archive(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备配置';

-- --------------------------------------------------------
-- 4. 设备维护记录
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_maintenance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(32) NOT NULL COMMENT '关联设备档案ID',
  type VARCHAR(16) NOT NULL COMMENT '维护类型：inspection巡检/maintenance维保/repair维修',
  plan_date DATE NOT NULL COMMENT '计划日期',
  actual_date DATE DEFAULT NULL COMMENT '实际执行日期',
  executor VARCHAR(64) DEFAULT NULL COMMENT '执行人',
  cost DECIMAL(10,2) DEFAULT NULL COMMENT '费用',
  content TEXT DEFAULT NULL COMMENT '维护内容',
  result VARCHAR(16) DEFAULT NULL COMMENT '结果：pass通过/fail未通过/na不适用',
  status VARCHAR(16) DEFAULT 'pending' COMMENT '状态：pending待执行/in_progress进行中/completed已完成/cancelled已取消/overdue已逾期',
  next_plan_date DATE DEFAULT NULL COMMENT '下次计划日期',
  attachments JSON DEFAULT NULL COMMENT '附件列表',
  created_by VARCHAR(64) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_device_id (device_id),
  INDEX idx_plan_date (plan_date),
  INDEX idx_status (status),
  FOREIGN KEY (device_id) REFERENCES device_archive(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备维护记录';

-- --------------------------------------------------------
-- 5. 单位人员/责任体系
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS unit_personnel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id VARCHAR(32) NOT NULL COMMENT '所属单位',
  name VARCHAR(64) NOT NULL COMMENT '姓名',
  role VARCHAR(32) NOT NULL COMMENT '角色：manager负责人/safety_officer安全员/operator操作员/duty值班员/fire_control消控员',
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(64) DEFAULT NULL,
  is_primary TINYINT(1) DEFAULT 0 COMMENT '是否主要责任人',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_id (unit_id),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单位人员/责任体系';

-- --------------------------------------------------------
-- 6. 初始化演示数据（可选）
-- --------------------------------------------------------
-- 为现有单位补充演示设备档案
INSERT IGNORE INTO device_archive (id, code, name, category, manufacturer, model, unit_id, building_id, status, protocol_type)
SELECT 
  CONCAT('DEV_', SUBSTRING(MD5(RAND()), 1, 8)) as id,
  CONCAT('EQ-', FLOOR(RAND()*900000)+100000) as code,
  CONCAT('演示设备-', FLOOR(RAND()*100)) as name,
  ELT(FLOOR(1+RAND()*8), 'detector', 'button', 'pump', 'fan', 'host', 'camera', 'elec-monitor', 'water') as category,
  ELT(FLOOR(1+RAND()*3), '海湾', '松江', '北大青鸟') as manufacturer,
  CONCAT('MODEL-', FLOOR(RAND()*100)) as model,
  u.id as unit_id,
  NULL as building_id,
  'normal' as status,
  ELT(FLOOR(1+RAND()*3), 'gb26875', 'modbus', 'mqtt') as protocol_type
FROM units u
LIMIT 5;
