-- ============================================================
-- Flyway Migration V002
-- 创建通用设备档案表 (devices)
-- 源文件: app/sql/device_archive_tables.sql
-- ============================================================

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
