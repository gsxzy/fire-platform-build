-- ============================================================
-- 设备档案表结构
-- 包含：通用设备、IoT设备、摄像头、国标设备
-- ============================================================

-- ------------------------------------------------------------
-- 1. devices 表（通用设备档案）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
    id              VARCHAR(64) PRIMARY KEY COMMENT '设备编码',
    name            VARCHAR(128) NOT NULL COMMENT '设备名称',
    type            VARCHAR(64) COMMENT '设备类型',
    unit_id         VARCHAR(64) COMMENT '所属单位ID',
    unit_name       VARCHAR(128) COMMENT '所属单位名称',
    location        VARCHAR(256) COMMENT '安装位置',
    status          VARCHAR(32) DEFAULT 'normal' COMMENT '状态：normal/fault/maintenance/offline/disabled',
    online_status   VARCHAR(32) DEFAULT 'offline' COMMENT '在线状态：online/offline/unknown',
    manufacturer    VARCHAR(128) COMMENT '制造商',
    model           VARCHAR(128) COMMENT '型号',
    firmware        VARCHAR(64) COMMENT '固件版本',
    ip              VARCHAR(32) COMMENT 'IP地址',
    install_date    DATE COMMENT '安装日期',
    last_maint_date DATE COMMENT '上次维保日期',
    next_maint_date DATE COMMENT '下次维保日期',
    heartbeat_interval INT DEFAULT 30 COMMENT '心跳间隔（秒）',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_unit_id (unit_id),
    INDEX idx_online_status (online_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通用设备档案表';


-- ------------------------------------------------------------
-- 2. iot_devices 表（IoT设备）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iot_devices (
    id                  VARCHAR(64) PRIMARY KEY COMMENT '设备编码',
    name                VARCHAR(128) NOT NULL COMMENT '设备名称',
    category            VARCHAR(64) COMMENT '分类',
    protocol            VARCHAR(64) COMMENT '通信协议',
    ip                  VARCHAR(32) COMMENT 'IP地址',
    port                INT COMMENT '端口',
    imei                VARCHAR(32) COMMENT 'IMEI号',
    unit_id             VARCHAR(64) COMMENT '所属单位ID',
    unit_name           VARCHAR(128) COMMENT '所属单位名称',
    floor               VARCHAR(32) COMMENT '楼层',
    room                VARCHAR(32) COMMENT '房间号',
    online_status       VARCHAR(32) DEFAULT 'offline' COMMENT '在线状态：online/offline/unknown',
    last_heartbeat      TIMESTAMP COMMENT '最后心跳时间',
    heartbeat_interval  INT DEFAULT 30 COMMENT '心跳间隔（秒）',
    register_count      INT DEFAULT 0 COMMENT '注册次数',
    manufacturer        VARCHAR(128) COMMENT '制造商',
    model               VARCHAR(128) COMMENT '型号',
    firmware            VARCHAR(64) COMMENT '固件版本',
    status              VARCHAR(32) DEFAULT 'normal' COMMENT '状态：normal/fault/maintenance/offline/disabled',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT设备档案表';


-- ------------------------------------------------------------
-- 3. cameras 表（摄像头）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cameras (
    id              VARCHAR(64) PRIMARY KEY COMMENT '设备编码',
    name            VARCHAR(128) NOT NULL COMMENT '设备名称',
    unit_id         VARCHAR(64) COMMENT '所属单位ID',
    unit_name       VARCHAR(128) COMMENT '所属单位名称',
    location        VARCHAR(256) COMMENT '安装位置',
    rtsp_url        VARCHAR(512) COMMENT 'RTSP流地址',
    stream_url      VARCHAR(512) COMMENT '直播流地址',
    type            VARCHAR(32) DEFAULT 'indoor' COMMENT '类型：indoor/outdoor/elevator/corridor/entrance',
    status          VARCHAR(32) DEFAULT 'normal' COMMENT '状态：normal/fault/maintenance/offline/disabled',
    online_status   VARCHAR(32) DEFAULT 'offline' COMMENT '在线状态：online/offline/unknown',
    device_id       VARCHAR(64) COMMENT 'WVP国标设备编码',
    channel_id      VARCHAR(64) COMMENT 'WVP通道编码',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='摄像头档案表';


-- ------------------------------------------------------------
-- 4. gb28181_devices 表（国标设备）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gb28181_devices (
    id              VARCHAR(64) PRIMARY KEY COMMENT '设备编码',
    device_id       VARCHAR(64) UNIQUE COMMENT '国标设备ID',
    name            VARCHAR(128) COMMENT '设备名称',
    manufacturer    VARCHAR(128) COMMENT '制造商',
    model           VARCHAR(128) COMMENT '型号',
    firmware        VARCHAR(64) COMMENT '固件版本',
    ip              VARCHAR(32) COMMENT 'IP地址',
    port            INT DEFAULT 5060 COMMENT '端口',
    transport       VARCHAR(8) DEFAULT 'UDP' COMMENT '传输协议：UDP/TCP',
    username        VARCHAR(64) COMMENT '用户名',
    password        VARCHAR(64) COMMENT '密码',
    status          VARCHAR(32) DEFAULT 'offline' COMMENT '状态：online/offline/unknown',
    register_time   TIMESTAMP COMMENT '注册时间',
    last_keepalive  TIMESTAMP COMMENT '最后保活时间',
    channel_count   INT DEFAULT 0 COMMENT '通道数量',
    catalog_synced  TINYINT DEFAULT 0 COMMENT '目录是否已同步：0-否 1-是',
    ptz_support     TINYINT DEFAULT 1 COMMENT '是否支持云台：0-否 1-是',
    unit_id         VARCHAR(64) COMMENT '所属单位ID',
    unit_name       VARCHAR(128) COMMENT '所属单位名称',
    location        VARCHAR(256) COMMENT '安装位置',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_device_id (device_id),
    INDEX idx_status (status),
    INDEX idx_unit_id (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GB28181国标设备档案表';
