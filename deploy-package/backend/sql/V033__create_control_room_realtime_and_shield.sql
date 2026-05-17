-- ============================================================
-- Flyway Migration V033
-- 创建消控室实时状态表和消控室屏蔽记录表
-- 源文件: app/sql/control_room_backend.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS control_room_realtime (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  room_id       VARCHAR(64)  DEFAULT NULL COMMENT '消控室ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  pressure_1    DECIMAL(10,3) DEFAULT 0 COMMENT '管网压力(MPa)',
  pressure_2    DECIMAL(10,3) DEFAULT 0 COMMENT '喷淋压力(MPa)',
  liquid_level_1 DECIMAL(10,3) DEFAULT 0 COMMENT '水箱液位(m)',
  liquid_level_2 DECIMAL(10,3) DEFAULT 0 COMMENT '水池液位(m)',
  video_status  TINYINT      DEFAULT 1 COMMENT '视频状态：0离线 1在线',
  host_status   TINYINT      DEFAULT 1 COMMENT '主机状态：0离线 1在线 2故障',
  current_mode  TINYINT      DEFAULT 2 COMMENT '当前模式：1手动 2自动',
  silenced      TINYINT      DEFAULT 0 COMMENT '消音状态：0未消音 1已消音',
  fire_count    INT          DEFAULT 0 COMMENT '当前火警数',
  fault_count   INT          DEFAULT 0 COMMENT '当前故障数',
  shield_count  INT          DEFAULT 0 COMMENT '当前屏蔽数',
  feedback_count INT         DEFAULT 0 COMMENT '当前反馈数',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_room_id (room_id),
  INDEX idx_host_id (host_id),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消控室实时状态表';

CREATE TABLE IF NOT EXISTS control_room_shield (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  room_id       VARCHAR(64)  DEFAULT NULL COMMENT '消控室ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  point_name    VARCHAR(64)  DEFAULT NULL COMMENT '点位名称',
  device_type   VARCHAR(64)  DEFAULT NULL COMMENT '设备类型',
  location      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  loop_no       INT          DEFAULT NULL COMMENT '回路号',
  point_no      INT          DEFAULT NULL COMMENT '点位号',
  shield_reason VARCHAR(256) NOT NULL COMMENT '屏蔽原因',
  shield_by     VARCHAR(64)  DEFAULT 'admin' COMMENT '屏蔽操作人',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0已解除 1屏蔽中',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '屏蔽时间',
  unshield_time TIMESTAMP    DEFAULT NULL COMMENT '解除时间',
  unshield_by   VARCHAR(64)  DEFAULT NULL COMMENT '解除操作人',
  INDEX idx_room_id (room_id),
  INDEX idx_host_id (host_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消控室屏蔽记录表';
