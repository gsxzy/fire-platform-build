-- ============================================================
-- Flyway Migration V032
-- 创建多线盘配置表和总线点位配置表
-- 源文件: app/sql/fire_control_expand.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS host_multiline (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  point_no      INT          NOT NULL COMMENT '点位号',
  point_name    VARCHAR(64)  NOT NULL COMMENT '点位名称',
  device_type   VARCHAR(64)  DEFAULT NULL COMMENT '设备类型',
  status        TINYINT      DEFAULT 0 COMMENT '状态：0停止 1启动 2故障',
  feedback_status TINYINT    DEFAULT 0 COMMENT '反馈状态：0无 1有',
  fault_status  TINYINT      DEFAULT 0 COMMENT '故障状态：0无 1有',
  location      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  sort_order    INT          DEFAULT 0 COMMENT '排序',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_point (host_id, point_no),
  INDEX idx_status (status),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='多线盘配置表';

CREATE TABLE IF NOT EXISTS host_bus_point (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  loop_no       INT          NOT NULL COMMENT '回路号',
  point_no      INT          NOT NULL COMMENT '点位号',
  point_name    VARCHAR(64)  NOT NULL COMMENT '点位名称',
  device_type   VARCHAR(64)  DEFAULT NULL COMMENT '设备类型',
  install_location VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  status        TINYINT      DEFAULT 0 COMMENT '状态：0正常 1火警 2故障 3屏蔽',
  sort_order    INT          DEFAULT 0 COMMENT '排序',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_loop_point (host_id, loop_no, point_no),
  INDEX idx_status (status),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='总线点位配置表';
