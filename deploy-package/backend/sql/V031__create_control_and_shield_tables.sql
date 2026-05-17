-- ============================================================
-- Flyway Migration V031
-- 创建远程控制命令日志表、屏蔽记录表和反馈记录表
-- 源文件: app/sql/fire_control_expand.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS control_command_log (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  room_id       VARCHAR(64)  DEFAULT NULL COMMENT '消控室ID',
  command_type  VARCHAR(32)  NOT NULL COMMENT '命令类型：silence|reset|mode|multiline_start|multiline_stop|bus_start|bus_stop|shield',
  command_desc  VARCHAR(256) DEFAULT NULL COMMENT '命令描述',
  point_id      BIGINT       DEFAULT NULL COMMENT '点位ID（多线/总线操作时使用）',
  point_name    VARCHAR(64)  DEFAULT NULL COMMENT '点位名称',
  old_value     VARCHAR(64)  DEFAULT NULL COMMENT '操作前状态',
  new_value     VARCHAR(64)  DEFAULT NULL COMMENT '操作后状态',
  operator      VARCHAR(64)  DEFAULT NULL COMMENT '操作人',
  result        TINYINT      DEFAULT 1 COMMENT '执行结果：0失败 1成功',
  result_msg    VARCHAR(256) DEFAULT NULL COMMENT '结果描述',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_host_id (host_id),
  INDEX idx_room_id (room_id),
  INDEX idx_command_type (command_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='远程控制命令日志表';

CREATE TABLE IF NOT EXISTS shield_record (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  loop_no       INT          DEFAULT NULL COMMENT '回路号',
  point_no      INT          DEFAULT NULL COMMENT '点位号',
  point_name    VARCHAR(64)  DEFAULT NULL COMMENT '点位名称',
  device_type   VARCHAR(64)  DEFAULT NULL COMMENT '设备类型',
  location      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  shield_reason VARCHAR(256) NOT NULL COMMENT '屏蔽原因',
  operator      VARCHAR(64)  DEFAULT NULL COMMENT '操作人',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0已解除 1屏蔽中',
  shield_time   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '屏蔽时间',
  unshield_time TIMESTAMP    DEFAULT NULL COMMENT '解除时间',
  unshield_reason VARCHAR(256) DEFAULT NULL COMMENT '解除原因',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_host_id (host_id),
  INDEX idx_status (status),
  INDEX idx_shield_time (shield_time),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='屏蔽记录表';

CREATE TABLE IF NOT EXISTS feedback_record (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  device_name   VARCHAR(64)  NOT NULL COMMENT '设备名称',
  device_type   VARCHAR(64)  DEFAULT NULL COMMENT '设备类型',
  location      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  feedback_type VARCHAR(32)  NOT NULL COMMENT '反馈类型：reset|start|stop|mode_change|fault_restore',
  feedback_desc VARCHAR(256) DEFAULT NULL COMMENT '反馈描述',
  loop_no       INT          DEFAULT NULL COMMENT '回路号',
  point_no      INT          DEFAULT NULL COMMENT '点位号',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0失效 1有效',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_host_id (host_id),
  INDEX idx_feedback_type (feedback_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='反馈记录表';
