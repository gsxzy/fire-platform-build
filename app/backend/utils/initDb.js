/**
 * ═══════════════════════════════════════════════════════════════
 * 数据库表结构自动初始化
 * 在应用启动时检查并创建关键业务表，确保核心功能可用
 * ═══════════════════════════════════════════════════════════════
 */
const { pool } = require('./db');

async function ensureTable(sql) {
  try {
    await pool.query(sql);
  } catch (err) {
    // 忽略表已存在的错误
    if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
      console.error('[initDb] 创建表失败:', err.message);
      throw err;
    }
  }
}

async function ensureColumn(table, columnDef) {
  try {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${columnDef}`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column name')) {
      // 列已存在，忽略
    } else {
      console.error(`[initDb] 为 ${table} 添加列失败:`, err.message);
    }
  }
}

async function initDb() {
  console.log('[initDb] 开始检查并初始化数据库表结构...');

  /* ── 1. 单位表 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS units (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      type VARCHAR(50) DEFAULT '商业',
      address VARCHAR(255) DEFAULT '',
      contact_name VARCHAR(64) DEFAULT '',
      contact_phone VARCHAR(32) DEFAULT '',
      status TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单位表'
  `);

  // 扩展单位表（兼容旧结构）
  await ensureColumn('units', 'contact_email VARCHAR(64) DEFAULT NULL COMMENT "联系人邮箱"');
  await ensureColumn('units', 'legal_person VARCHAR(64) DEFAULT NULL COMMENT "法人姓名"');
  await ensureColumn('units', 'license_no VARCHAR(64) DEFAULT NULL COMMENT "统一社会信用代码"');
  await ensureColumn('units', 'area DECIMAL(10,2) DEFAULT NULL COMMENT "占地面积(㎡)"');
  await ensureColumn('units', 'lng DECIMAL(10,7) DEFAULT NULL COMMENT "经度"');
  await ensureColumn('units', 'lat DECIMAL(10,7) DEFAULT NULL COMMENT "纬度"');
  await ensureColumn('units', 'risk_level VARCHAR(16) DEFAULT \'low\' COMMENT "风险等级"');
  await ensureColumn('units', 'supervision_level VARCHAR(16) DEFAULT \'general\' COMMENT "监管等级"');
  await ensureColumn('units', 'parent_id VARCHAR(32) DEFAULT NULL COMMENT "上级单位ID"');
  await ensureColumn('units', 'remark TEXT DEFAULT NULL COMMENT "备注"');
  await ensureColumn('units', 'jurisdiction VARCHAR(128) DEFAULT NULL COMMENT "所属辖区/片区"');
  await ensureColumn('units', 'safety_officer_name VARCHAR(64) DEFAULT NULL COMMENT "安全员姓名"');
  await ensureColumn('units', 'safety_officer_phone VARCHAR(32) DEFAULT NULL COMMENT "安全员电话"');
  await ensureColumn('units', 'maint_company_id VARCHAR(64) DEFAULT NULL COMMENT "维保单位ID"');

  /* ── 2. 建筑表 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS fire_building (
      id VARCHAR(32) PRIMARY KEY COMMENT '建筑ID',
      unit_id VARCHAR(64) DEFAULT NULL COMMENT '所属单位',
      name VARCHAR(128) NOT NULL COMMENT '建筑名称',
      type VARCHAR(32) DEFAULT NULL COMMENT '建筑类型',
      total_floors INT DEFAULT 1 COMMENT '总层数',
      address VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_unit_id (unit_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='建筑物表'
  `);

  /* ── 3. 楼层表 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS fire_floor (
      id VARCHAR(32) PRIMARY KEY COMMENT '楼层ID',
      building_id VARCHAR(32) NOT NULL COMMENT '所属建筑',
      name VARCHAR(64) NOT NULL COMMENT '楼层名称',
      floor_no INT DEFAULT 1 COMMENT '层号',
      plan_image_url VARCHAR(512) DEFAULT NULL COMMENT '平面图图片URL',
      plan_cad_url VARCHAR(512) DEFAULT NULL COMMENT 'CAD图纸URL',
      plan_cad_data JSON DEFAULT NULL COMMENT 'CAD解析数据',
      plan_type VARCHAR(16) DEFAULT NULL COMMENT '平面图类型',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_building_id (building_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='楼层表'
  `);

  /* ── 4. 设备档案总台账 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS device_archive (
      id VARCHAR(32) PRIMARY KEY COMMENT '平台统一设备ID',
      code VARCHAR(64) UNIQUE NOT NULL COMMENT '设备编码（一物一码）',
      name VARCHAR(128) NOT NULL COMMENT '设备名称',
      category VARCHAR(32) NOT NULL COMMENT '设备类别',
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
      protocol_type VARCHAR(16) DEFAULT NULL COMMENT '协议类型',
      protocol_device_id VARCHAR(64) DEFAULT NULL COMMENT '关联协议层设备ID',
      ip VARCHAR(64) DEFAULT NULL COMMENT 'IP地址',
      port INT DEFAULT NULL COMMENT '端口号',
      status VARCHAR(16) DEFAULT 'normal' COMMENT '运行状态',
      archive_status VARCHAR(16) DEFAULT 'unallocated' COMMENT '档案流程状态',
      calibration_cycle INT DEFAULT 12 COMMENT '校准周期(月)',
      scrap_year INT DEFAULT 10 COMMENT '报废年限(年)',
      health_score INT DEFAULT 100 COMMENT '设备健康度',
      created_by VARCHAR(64) DEFAULT NULL COMMENT '录入人',
      remark TEXT DEFAULT NULL COMMENT '备注',
      qr_code VARCHAR(255) DEFAULT NULL COMMENT '二维码URL',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_unit_id (unit_id),
      INDEX idx_building_id (building_id),
      INDEX idx_floor_id (floor_id),
      INDEX idx_category (category),
      INDEX idx_status (status),
      INDEX idx_archive_status (archive_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备档案总台账（一物一码）'
  `);
  await ensureColumn('device_archive', 'point_id VARCHAR(32) DEFAULT NULL COMMENT "安装点位ID（仅能通过设备分配写入，不由档案录入直绑）"');
  await ensureColumn('device_archive', 'gateway_id VARCHAR(64) DEFAULT NULL COMMENT "关联的用户信息传输装置ID(FSCN8001)"');

  /* ── 5. 设备配置 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS device_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(32) NOT NULL COMMENT '关联设备档案ID',
      protocol_type VARCHAR(16) DEFAULT NULL COMMENT '协议类型',
      communication_params JSON DEFAULT NULL COMMENT '通信参数',
      alarm_thresholds JSON DEFAULT NULL COMMENT '告警阈值配置',
      linkage_rules JSON DEFAULT NULL COMMENT '联动规则',
      heartbeat_interval INT DEFAULT 60 COMMENT '心跳间隔秒',
      data_collection_interval INT DEFAULT 300 COMMENT '数据采集间隔秒',
      auto_report TINYINT(1) DEFAULT 1 COMMENT '是否自动上报',
      mute_enabled TINYINT(1) DEFAULT 1 COMMENT '是否允许消音',
      reset_enabled TINYINT(1) DEFAULT 1 COMMENT '是否允许复位',
      remote_control_enabled TINYINT(1) DEFAULT 0 COMMENT '是否允许远程控制',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_device_id (device_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备配置'
  `);

  /* ── 6. 设备维护记录 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS device_maintenance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(32) NOT NULL COMMENT '关联设备档案ID',
      type VARCHAR(16) NOT NULL COMMENT '维护类型',
      plan_date DATE NOT NULL COMMENT '计划日期',
      actual_date DATE DEFAULT NULL COMMENT '实际执行日期',
      executor VARCHAR(64) DEFAULT NULL COMMENT '执行人',
      cost DECIMAL(10,2) DEFAULT NULL COMMENT '费用',
      content TEXT DEFAULT NULL COMMENT '维护内容',
      result VARCHAR(16) DEFAULT NULL COMMENT '结果',
      status VARCHAR(16) DEFAULT 'pending' COMMENT '状态',
      next_plan_date DATE DEFAULT NULL COMMENT '下次计划日期',
      attachments JSON DEFAULT NULL COMMENT '附件列表',
      created_by VARCHAR(64) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_plan_date (plan_date),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备维护记录'
  `);

  /* ── 7. 单位人员 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS unit_personnel (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unit_id VARCHAR(32) NOT NULL COMMENT '所属单位',
      name VARCHAR(64) NOT NULL COMMENT '姓名',
      role VARCHAR(32) NOT NULL COMMENT '角色',
      phone VARCHAR(20) DEFAULT NULL,
      email VARCHAR(64) DEFAULT NULL,
      is_primary TINYINT(1) DEFAULT 0 COMMENT '是否主要责任人',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_unit_id (unit_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单位人员/责任体系'
  `);

  /* ── 8. 设备接入管理 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS device_access (
      id VARCHAR(32) PRIMARY KEY COMMENT '接入ID',
      device_id VARCHAR(32) NOT NULL COMMENT '设备档案ID',
      unit_id VARCHAR(32) NOT NULL COMMENT '所属单位ID',
      gateway_no VARCHAR(64) DEFAULT NULL COMMENT '网关编号',
      protocol VARCHAR(32) NOT NULL COMMENT '通信协议',
      access_address VARCHAR(128) DEFAULT NULL COMMENT '接入地址/IP',
      port INT DEFAULT NULL COMMENT '端口号',
      heartbeat_interval INT DEFAULT 60 COMMENT '心跳间隔(秒)',
      encrypt_type VARCHAR(32) DEFAULT NULL COMMENT '加密方式',
      access_status VARCHAR(16) DEFAULT 'disconnected' COMMENT '接入状态',
      config_json JSON DEFAULT NULL COMMENT '扩展配置参数',
      last_test_time TIMESTAMP DEFAULT NULL COMMENT '最后测试时间',
      last_test_result VARCHAR(16) DEFAULT NULL COMMENT '最后测试结果',
      fail_reason VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
      created_by VARCHAR(64) DEFAULT NULL COMMENT '创建人',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_device_id (device_id),
      INDEX idx_unit_id (unit_id),
      INDEX idx_access_status (access_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备接入管理'
  `);

  /* ── 9. 设备分配记录 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS device_allocation_log (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(32) NOT NULL COMMENT '设备档案ID',
      unit_id VARCHAR(32) NOT NULL COMMENT '分配到的单位ID',
      building_id VARCHAR(32) DEFAULT NULL COMMENT '建筑ID',
      floor_id VARCHAR(32) DEFAULT NULL COMMENT '楼层ID',
      point_id VARCHAR(32) DEFAULT NULL COMMENT '点位ID',
      action VARCHAR(16) NOT NULL COMMENT '操作',
      operator VARCHAR(64) DEFAULT NULL COMMENT '操作人',
      remark VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_unit_id (unit_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备分配记录'
  `);

  /* ── 10. 设备接入日志 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS device_access_log (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(32) NOT NULL COMMENT '设备档案ID',
      access_id VARCHAR(32) NOT NULL COMMENT '接入记录ID',
      action VARCHAR(16) NOT NULL COMMENT '操作',
      access_params JSON DEFAULT NULL COMMENT '接入参数快照',
      result VARCHAR(16) DEFAULT NULL COMMENT '结果',
      fail_reason VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
      operator VARCHAR(64) DEFAULT NULL COMMENT '操作人',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_access_id (access_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备接入日志'
  `);

  /* ── 11. 遗留设备表（兼容 fireHostApi.js） ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS devices (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      type VARCHAR(32) DEFAULT NULL,
      unit_id VARCHAR(64) DEFAULT NULL,
      unit_name VARCHAR(128) DEFAULT NULL,
      location VARCHAR(256) DEFAULT NULL,
      status VARCHAR(32) DEFAULT 'normal',
      online_status VARCHAR(32) DEFAULT 'offline',
      manufacturer VARCHAR(128) DEFAULT NULL,
      model VARCHAR(128) DEFAULT NULL,
      firmware VARCHAR(64) DEFAULT NULL,
      ip VARCHAR(32) DEFAULT NULL,
      install_date DATE DEFAULT NULL,
      last_maint_date DATE DEFAULT NULL,
      next_maint_date DATE DEFAULT NULL,
      heartbeat_interval INT DEFAULT 30,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通用设备表（旧）'
  `);

  /* ── 12. IoT 设备表（兼容 fireHostApi.js） ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS iot_devices (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      category VARCHAR(32) DEFAULT NULL,
      protocol VARCHAR(32) DEFAULT NULL,
      ip VARCHAR(32) DEFAULT NULL,
      port INT DEFAULT NULL,
      imei VARCHAR(64) DEFAULT NULL,
      unit_id VARCHAR(64) DEFAULT NULL,
      unit_name VARCHAR(128) DEFAULT NULL,
      floor VARCHAR(32) DEFAULT NULL,
      room VARCHAR(64) DEFAULT NULL,
      online_status VARCHAR(32) DEFAULT 'offline',
      last_heartbeat TIMESTAMP DEFAULT NULL,
      heartbeat_interval INT DEFAULT 30,
      register_count INT DEFAULT 0,
      manufacturer VARCHAR(128) DEFAULT NULL,
      model VARCHAR(128) DEFAULT NULL,
      firmware VARCHAR(64) DEFAULT NULL,
      status VARCHAR(32) DEFAULT 'normal',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT设备表'
  `);

  /* ── 13. 摄像头表（兼容 fireHostApi.js） ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS cameras (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      unit_id VARCHAR(64) DEFAULT NULL,
      unit_name VARCHAR(128) DEFAULT NULL,
      location VARCHAR(256) DEFAULT NULL,
      rtsp_url VARCHAR(512) DEFAULT NULL,
      stream_url VARCHAR(512) DEFAULT NULL,
      type VARCHAR(32) DEFAULT 'indoor',
      status VARCHAR(32) DEFAULT 'normal',
      online_status VARCHAR(32) DEFAULT 'offline',
      device_id VARCHAR(64) DEFAULT NULL,
      channel_id VARCHAR(64) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='摄像头表'
  `);

  /* ── 14. 消控室视频关联（兼容 fireHostApi.js） ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS control_room_video (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      room_id VARCHAR(32) DEFAULT NULL,
      camera_no VARCHAR(64) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_camera_no (camera_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消控室视频关联'
  `);

  /* ── 15. GB28181 设备表 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS gb28181_devices (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      device_id VARCHAR(64) DEFAULT NULL,
      manufacturer VARCHAR(128) DEFAULT NULL,
      model VARCHAR(128) DEFAULT NULL,
      firmware VARCHAR(64) DEFAULT NULL,
      ip VARCHAR(32) DEFAULT NULL,
      port INT DEFAULT 5060,
      transport VARCHAR(16) DEFAULT 'UDP',
      username VARCHAR(64) DEFAULT NULL,
      password VARCHAR(64) DEFAULT NULL,
      status VARCHAR(32) DEFAULT 'offline',
      register_time TIMESTAMP DEFAULT NULL,
      last_keepalive TIMESTAMP DEFAULT NULL,
      channel_count INT DEFAULT 0,
      catalog_synced TINYINT(1) DEFAULT 0,
      ptz_support TINYINT(1) DEFAULT 1,
      unit_id VARCHAR(64) DEFAULT NULL,
      unit_name VARCHAR(128) DEFAULT NULL,
      location VARCHAR(256) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GB28181国标设备表'
  `);

  /* ── 16. 告警表 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS fire_alarm (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      alarm_no VARCHAR(32) DEFAULT NULL,
      device_id VARCHAR(64) NOT NULL,
      device_name VARCHAR(128) DEFAULT NULL,
      protocol VARCHAR(32) DEFAULT NULL,
      unit_id VARCHAR(64) DEFAULT 'PENDING',
      unit_name VARCHAR(128) DEFAULT '待分配单位',
      alarm_type VARCHAR(32) NOT NULL,
      alarm_level TINYINT DEFAULT 1,
      alarm_status TINYINT DEFAULT 1,
      location VARCHAR(256) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      raw_data TEXT DEFAULT NULL,
      loop_no INT DEFAULT NULL,
      address INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_unit_id (unit_id),
      INDEX idx_alarm_type (alarm_type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统一告警记录表'
  `);

  /* ── 16.5 FSCN8001 传输装置表 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS fscn8001_device (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      device_sn VARCHAR(64) NOT NULL UNIQUE COMMENT '设备序列号',
      device_name VARCHAR(128) DEFAULT NULL COMMENT '设备名称',
      ip VARCHAR(32) DEFAULT NULL COMMENT 'IP地址',
      port INT DEFAULT NULL COMMENT '端口',
      status TINYINT DEFAULT 1 COMMENT '0离线 1在线 2故障',
      last_heartbeat TIMESTAMP DEFAULT NULL COMMENT '最后心跳时间',
      login_time TIMESTAMP DEFAULT NULL COMMENT '登录时间',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_device_sn (device_sn),
      INDEX idx_status (status),
      INDEX idx_updated_at (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='FSCN8001传输装置表'
  `);

  /* ── 16.6 FSCN8001 报警记录表 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS fscn8001_alarm (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      device_sn VARCHAR(64) NOT NULL COMMENT '设备序列号',
      host_code VARCHAR(64) DEFAULT NULL COMMENT '主机编码',
      loop_no INT DEFAULT NULL COMMENT '回路号',
      address INT DEFAULT NULL COMMENT '设备地址',
      device_type VARCHAR(64) DEFAULT NULL COMMENT '设备类型',
      alarm_type VARCHAR(32) DEFAULT NULL COMMENT '报警类型 fire/fault/supervisory',
      alarm_level VARCHAR(32) DEFAULT NULL COMMENT '报警级别 high/normal/low',
      location VARCHAR(256) DEFAULT NULL COMMENT '位置',
      status TINYINT DEFAULT 0 COMMENT '0未处理 1已确认 2已处理',
      alarm_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '报警时间',
      recover_time TIMESTAMP DEFAULT NULL COMMENT '恢复时间',
      INDEX idx_device_sn (device_sn),
      INDEX idx_alarm_time (alarm_time),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='FSCN8001报警记录表'
  `);

  /* ── 16.7 FSCN8001 原始报文日志表 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS fscn8001_raw_log (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      device_sn VARCHAR(64) NOT NULL COMMENT '设备序列号',
      direction VARCHAR(16) DEFAULT 'RX' COMMENT '方向 RX/TX',
      cmd_type VARCHAR(32) DEFAULT NULL COMMENT '命令类型',
      hex_data TEXT COMMENT '十六进制原始数据',
      parsed_json TEXT COMMENT '解析后的JSON',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_sn (device_sn),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='FSCN8001原始报文日志表'
  `);

  /* ── 16.8 alarms 表（兼容 fscn8001Server.js 内置HTTP API） ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS alarms (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(64) NOT NULL COMMENT '设备ID',
      alarm_type VARCHAR(32) DEFAULT NULL COMMENT '告警类型',
      alarm_level VARCHAR(32) DEFAULT NULL COMMENT '告警级别',
      description TEXT DEFAULT NULL COMMENT '描述',
      status VARCHAR(32) DEFAULT 'new' COMMENT '状态',
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
      resolved_by VARCHAR(64) DEFAULT NULL COMMENT '处理人',
      resolved_at TIMESTAMP DEFAULT NULL COMMENT '处理时间',
      notes TEXT DEFAULT NULL COMMENT '备注',
      INDEX idx_device_id (device_id),
      INDEX idx_alarm_type (alarm_type),
      INDEX idx_status (status),
      INDEX idx_start_time (start_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='告警记录表（兼容旧版API）'
  `);
  await ensureColumn('alarms', 'loop_no INT DEFAULT NULL COMMENT "回路号"');
  await ensureColumn('alarms', 'point_no INT DEFAULT NULL COMMENT "点位号"');
  await ensureColumn('alarms', 'raw_frame_hex TEXT DEFAULT NULL COMMENT "原始帧HEX(排障用)"');

  /* ── 18. 平面图点位与摄像头关联表 ── */
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS fire_floor_device_position (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      floor_id VARCHAR(32) NOT NULL COMMENT '楼层ID',
      device_id VARCHAR(32) NOT NULL COMMENT '设备ID',
      x DECIMAL(10,2) DEFAULT 0 COMMENT 'X坐标',
      y DECIMAL(10,2) DEFAULT 0 COMMENT 'Y坐标',
      status VARCHAR(16) DEFAULT 'normal' COMMENT '点位状态',
      bind_camera_id VARCHAR(64) DEFAULT NULL COMMENT '关联摄像头ID',
      bind_camera_channel VARCHAR(64) DEFAULT NULL COMMENT '关联摄像头通道',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_floor_device (floor_id, device_id),
      INDEX idx_floor_id (floor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='楼层设备点位表'
  `);

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS fire_floor_camera_binding (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      floor_id VARCHAR(32) NOT NULL COMMENT '楼层ID',
      camera_device_id VARCHAR(64) NOT NULL COMMENT '摄像头设备ID',
      bound_device_ids JSON DEFAULT NULL COMMENT '关联设备ID列表',
      x DECIMAL(10,2) DEFAULT 0 COMMENT 'X坐标',
      y DECIMAL(10,2) DEFAULT 0 COMMENT 'Y坐标',
      preset_no INT DEFAULT 0 COMMENT '预置位编号',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_floor_id (floor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='楼层摄像头关联表'
  `);

  /* ── 17. 其他常用表（为 stub.js 提供支持） ── */
  const stubTables = [
    `work_orders (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `maint_records (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `patrol_plans (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), content JSON DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `patrol_records (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `hazards (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), level VARCHAR(32), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `plans (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), content JSON DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `drills (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), content JSON DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `inspections (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `documents (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), category VARCHAR(64), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `notifications (id BIGINT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(256), is_read TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `duty_schedules (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), content JSON DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `duty_shifts (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), content JSON DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `duty_handovers (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), content JSON DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `alarm_snapshots (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `control_room_configs (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `floor_devices (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `floor_plans (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `system_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, action VARCHAR(256), module VARCHAR(64) DEFAULT NULL, detail TEXT DEFAULT NULL, result VARCHAR(16) DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `reports (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `training_courses (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `training_exams (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `ai_decisions (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `smart_alerts (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `departments (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), code VARCHAR(64) DEFAULT NULL, parent VARCHAR(128) DEFAULT NULL, manager VARCHAR(64) DEFAULT NULL, phone VARCHAR(32) DEFAULT NULL, staff_count INT DEFAULT 0, unit_count INT DEFAULT 0, status VARCHAR(32) DEFAULT '正常', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `sys_role (id BIGINT AUTO_INCREMENT PRIMARY KEY, role_code VARCHAR(64), role_name VARCHAR(64), description VARCHAR(256), status TINYINT DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `sys_permission (id BIGINT AUTO_INCREMENT PRIMARY KEY, permission_code VARCHAR(64), permission_name VARCHAR(64), description VARCHAR(256), status TINYINT DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `sys_role_permission (id BIGINT AUTO_INCREMENT PRIMARY KEY, role_id BIGINT, permission_id BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `sys_user_role (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT, role_id BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `sys_data_scope (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `duty_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(128), status VARCHAR(32), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
  ];

  for (const def of stubTables) {
    const tableName = def.split(' ')[0];
    await ensureTable(`CREATE TABLE IF NOT EXISTS ${def} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  console.log('[initDb] 数据库表结构初始化完成');
}

module.exports = { initDb };
