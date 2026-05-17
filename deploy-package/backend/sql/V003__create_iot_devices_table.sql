-- ============================================================
-- Flyway Migration V003
-- 创建 IoT 设备档案表 (iot_devices)
-- 源文件: app/sql/device_archive_tables.sql
-- ============================================================

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
