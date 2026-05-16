-- ============================================================
-- Flyway Migration V004
-- 创建摄像头档案表 (cameras)
-- 源文件: app/sql/device_archive_tables.sql
-- ============================================================

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
