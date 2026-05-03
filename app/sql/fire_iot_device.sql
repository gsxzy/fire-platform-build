-- ============================================================
-- IoT 设备统一档案表 & 告警表
-- 供 GB26875 / FSCN8001 协议服务器共用
-- ============================================================

-- ------------------------------------------------------------
-- 1. fire_iot_device 表（IoT 设备统一档案）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fire_iot_device (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '自增ID',
    device_id           VARCHAR(64) NOT NULL COMMENT '设备唯一编码（协议层ID）',
    device_name         VARCHAR(128) DEFAULT NULL COMMENT '设备名称',
    protocol            VARCHAR(32) NOT NULL COMMENT '协议类型：gb26875 / fscn8001 / modbus / mqtt',
    ip                  VARCHAR(32) DEFAULT NULL COMMENT 'IP地址',
    port                INT DEFAULT NULL COMMENT '端口',
    unit_id             VARCHAR(64) DEFAULT 'PENDING' COMMENT '所属单位ID',
    unit_name           VARCHAR(128) DEFAULT '待分配单位' COMMENT '所属单位名称',
    building_id         VARCHAR(64) DEFAULT NULL COMMENT '建筑物编号',
    location            VARCHAR(256) DEFAULT NULL COMMENT '安装位置',
    manufacturer        VARCHAR(128) DEFAULT NULL COMMENT '制造商',
    model               VARCHAR(128) DEFAULT NULL COMMENT '型号',
    firmware            VARCHAR(64) DEFAULT NULL COMMENT '固件版本',
    status              VARCHAR(32) DEFAULT 'normal' COMMENT '状态：normal/fault/maintenance/offline/disabled',
    online_status       VARCHAR(32) DEFAULT 'offline' COMMENT '在线状态：online/offline/unknown',
    last_online         TIMESTAMP DEFAULT NULL COMMENT '最后在线时间（心跳/注册）',
    login_time          TIMESTAMP DEFAULT NULL COMMENT '最后登录时间',
    offline_time        TIMESTAMP DEFAULT NULL COMMENT '离线时间',
    heartbeat_interval  INT DEFAULT 60 COMMENT '心跳间隔（秒）',
    register_count      INT DEFAULT 0 COMMENT '注册次数',
    alarm_count         INT DEFAULT 0 COMMENT '累计告警次数',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    UNIQUE KEY uk_device_id_protocol (device_id, protocol),
    INDEX idx_protocol (protocol),
    INDEX idx_unit_id (unit_id),
    INDEX idx_online_status (online_status),
    INDEX idx_last_online (last_online)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT 设备统一档案表';


-- ------------------------------------------------------------
-- 2. fire_alarm 表（统一告警记录）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fire_alarm (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '自增ID',
    alarm_no            VARCHAR(32) NOT NULL COMMENT '告警编号（自动生成）',
    device_id           VARCHAR(64) NOT NULL COMMENT '设备ID',
    device_name         VARCHAR(128) DEFAULT NULL COMMENT '设备名称',
    protocol            VARCHAR(32) NOT NULL COMMENT '协议类型',
    unit_id             VARCHAR(64) DEFAULT 'PENDING' COMMENT '所属单位ID',
    unit_name           VARCHAR(128) DEFAULT '待分配单位' COMMENT '所属单位名称',
    alarm_type          VARCHAR(32) NOT NULL COMMENT '告警类型：fire/fault/feedback/supervisory/offline/...',
    alarm_level         TINYINT DEFAULT 1 COMMENT '告警等级：1=提示 2=一般 3=严重 4=紧急',
    alarm_status        TINYINT DEFAULT 1 COMMENT '告警状态：1=未处理 2=处理中 3=已确认 4=已恢复',
    location            VARCHAR(256) DEFAULT NULL COMMENT '位置',
    description         TEXT DEFAULT NULL COMMENT '告警描述',
    raw_data            TEXT DEFAULT NULL COMMENT '原始数据',
    loop_no             INT DEFAULT NULL COMMENT '回路号（GB26875）',
    address             INT DEFAULT NULL COMMENT '设备地址（GB26875）',
    host_code           VARCHAR(32) DEFAULT NULL COMMENT '主机编号',
    trigger_time        TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '触发时间',
    confirm_time        TIMESTAMP DEFAULT NULL COMMENT '确认时间',
    recover_time        TIMESTAMP DEFAULT NULL COMMENT '恢复时间',
    handler_id          VARCHAR(64) DEFAULT NULL COMMENT '处理人ID',
    handler_name        VARCHAR(64) DEFAULT NULL COMMENT '处理人姓名',
    handle_remark       TEXT DEFAULT NULL COMMENT '处理备注',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_device_id (device_id),
    INDEX idx_alarm_type (alarm_type),
    INDEX idx_alarm_status (alarm_status),
    INDEX idx_trigger_time (trigger_time),
    INDEX idx_unit_id (unit_id),
    INDEX idx_protocol (protocol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统一告警记录表';


-- ------------------------------------------------------------
-- 3. 预插入"待分配单位"占位（如果 units 表不存在则忽略）
-- ------------------------------------------------------------
-- INSERT IGNORE INTO units (id, name) VALUES ('PENDING', '待分配单位');
