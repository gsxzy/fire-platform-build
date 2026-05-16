-- ============================================================
-- Flyway Migration V034
-- 创建消控室控制命令日志表和消控室视频监控表
-- 源文件: app/sql/control_room_backend.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS control_room_command_log (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  room_id       VARCHAR(64)  DEFAULT NULL COMMENT '消控室ID',
  command_type  VARCHAR(32)  NOT NULL COMMENT '命令类型：silence|reset|mode|multiline_start|multiline_stop|bus_start|bus_stop|shield',
  command_value VARCHAR(64)  DEFAULT NULL COMMENT '命令值',
  command_time  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '命令时间',
  command_by    VARCHAR(64)  DEFAULT 'admin' COMMENT '操作人',
  result        TINYINT      DEFAULT 1 COMMENT '执行结果：0失败 1成功',
  point_name    VARCHAR(64)  DEFAULT NULL COMMENT '点位名称',
  INDEX idx_host_id (host_id),
  INDEX idx_room_id (room_id),
  INDEX idx_command_type (command_type),
  INDEX idx_command_time (command_time),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消控室控制命令日志表';

CREATE TABLE IF NOT EXISTS control_room_video (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  room_id       VARCHAR(64)  NOT NULL COMMENT '消控室ID',
  camera_name   VARCHAR(64)  NOT NULL COMMENT '摄像头名称',
  camera_no     VARCHAR(32)  NOT NULL COMMENT '摄像头编号',
  stream_url    VARCHAR(512) DEFAULT NULL COMMENT '视频流地址',
  protocol      VARCHAR(16)  DEFAULT 'HLS' COMMENT '协议：HLS|WebRTC|RTMP|RTSP',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0离线 1在线',
  position      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  sort_order    INT          DEFAULT 0 COMMENT '排序',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_room_id (room_id),
  INDEX idx_status (status),
  UNIQUE KEY uk_room_camera_no (room_id, camera_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消控室视频监控表';
