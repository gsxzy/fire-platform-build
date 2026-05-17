-- ============================================================
-- Flyway Migration V005
-- 创建 GB28181 国标设备档案表 (gb28181_devices)
-- 源文件: app/sql/device_archive_tables.sql
-- ============================================================

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
