-- ============================================================
-- 消控室集中监控后端专用表
-- 对应 backend/fireHostApi.js 中 /control-rooms/* 路由
-- ============================================================

-- 1. control_room_realtime 实时状态表
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

-- 2. control_room_shield 屏蔽记录表
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

-- 3. control_room_command_log 控制命令日志表
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

-- 4. control_room_video 视频监控表
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

-- 5. multiline_panel 多线盘控制表
CREATE TABLE IF NOT EXISTS multiline_panel (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='多线盘控制表';

-- 6. bus_panel 总线盘控制表
CREATE TABLE IF NOT EXISTS bus_panel (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '主机ID',
  loop_no       INT          NOT NULL COMMENT '回路号',
  point_no      INT          NOT NULL COMMENT '点位号',
  point_name    VARCHAR(64)  NOT NULL COMMENT '点位名称',
  device_type   VARCHAR(64)  DEFAULT NULL COMMENT '设备类型',
  install_location VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  status        TINYINT      DEFAULT 0 COMMENT '状态：0正常 1火警 2故障 3屏蔽',
  feedback_status TINYINT    DEFAULT 0 COMMENT '反馈状态：0无 1有',
  sort_order    INT          DEFAULT 0 COMMENT '排序',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_loop_point (host_id, loop_no, point_no),
  INDEX idx_status (status),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='总线盘控制表';

-- ============================================================
-- 初始化数据
-- ============================================================

-- 初始化实时状态（为每个主机创建一条记录）
INSERT IGNORE INTO control_room_realtime (room_id, host_id, pressure_1, pressure_2, liquid_level_1, liquid_level_2, video_status, host_status, current_mode, silenced, fire_count, fault_count, shield_count, feedback_count) VALUES
('CR-001', 1, 0.42, 0.38, 3.85, 4.20, 1, 1, 2, 0, 0, 0, 0, 0),
('CR-002', 2, 0.45, 0.40, 3.90, 4.50, 1, 1, 2, 0, 0, 0, 0, 0),
('CR-003', 3, 0.40, 0.35, 3.80, 4.10, 1, 1, 2, 0, 0, 0, 0, 0),
('CR-004', 4, 0.43, 0.39, 3.88, 4.30, 1, 1, 2, 0, 0, 0, 0, 0),
('CR-005', 5, 0.41, 0.37, 3.82, 4.15, 1, 1, 2, 0, 0, 0, 0, 0);

-- 初始化多线盘（每个主机5路）
INSERT IGNORE INTO multiline_panel (host_id, point_no, point_name, device_type, status, feedback_status, fault_status, location, sort_order) VALUES
(1, 1, '喷淋泵启动', '喷淋泵', 0, 0, 0, 'B1水泵房', 1),
(1, 2, '消防泵启动', '消防泵', 0, 0, 0, 'B1水泵房', 2),
(1, 3, '排烟风机启动', '排烟风机', 0, 0, 0, '楼顶风机房', 3),
(1, 4, '正压送风机启动', '正压送风机', 0, 0, 0, '楼顶风机房', 4),
(1, 5, '消防广播', '广播设备', 0, 0, 0, '1F消防控制室', 5),
(2, 1, '喷淋泵启动', '喷淋泵', 0, 0, 0, 'B2水泵房', 1),
(2, 2, '消防泵启动', '消防泵', 0, 0, 0, 'B2水泵房', 2),
(2, 3, '排烟风机启动', '排烟风机', 0, 0, 0, '屋顶', 3),
(2, 4, '正压送风机启动', '正压送风机', 0, 0, 0, '屋顶', 4),
(2, 5, '消防广播', '广播设备', 0, 0, 0, '1F控制室', 5),
(3, 1, '喷淋泵启动', '喷淋泵', 0, 0, 0, 'B1水泵房', 1),
(3, 2, '消防泵启动', '消防泵', 0, 0, 0, 'B1水泵房', 2),
(3, 3, '排烟风机启动', '排烟风机', 0, 0, 0, '楼顶', 3),
(3, 4, '正压送风机启动', '正压送风机', 0, 0, 0, '楼顶', 4),
(3, 5, '消防广播', '广播设备', 0, 0, 0, '1F控制室', 5),
(4, 1, '喷淋泵启动', '喷淋泵', 0, 0, 0, 'B1水泵房', 1),
(4, 2, '消防泵启动', '消防泵', 0, 0, 0, 'B1水泵房', 2),
(4, 3, '排烟风机启动', '排烟风机', 0, 0, 0, '楼顶', 3),
(4, 4, '正压送风机启动', '正压送风机', 0, 0, 0, '楼顶', 4),
(4, 5, '消防广播', '广播设备', 0, 0, 0, '1F控制室', 5),
(5, 1, '喷淋泵启动', '喷淋泵', 0, 0, 0, 'B1水泵房', 1),
(5, 2, '消防泵启动', '消防泵', 0, 0, 0, 'B1水泵房', 2),
(5, 3, '排烟风机启动', '排烟风机', 0, 0, 0, '楼顶', 3),
(5, 4, '正压送风机启动', '正压送风机', 0, 0, 0, '楼顶', 4),
(5, 5, '消防广播', '广播设备', 0, 0, 0, '1F控制室', 5);

-- 初始化总线盘（主机1的32个点）
INSERT IGNORE INTO bus_panel (host_id, loop_no, point_no, point_name, device_type, install_location, status, feedback_status, sort_order) VALUES
(1, 1, 1, '1F大厅东侧烟感', '烟感探测器', '1F大厅东侧', 0, 0, 1),
(1, 1, 2, '1F大厅西侧烟感', '烟感探测器', '1F大厅西侧', 0, 0, 2),
(1, 1, 3, '1F大厅中央温感', '温感探测器', '1F大厅中央', 0, 0, 3),
(1, 1, 4, '1F大厅出口手报', '手动报警按钮', '1F大厅出口', 0, 0, 4),
(1, 1, 5, '1F大厅声光报警', '声光报警器', '1F大厅', 0, 0, 5),
(1, 1, 6, '1F大厅输入输出', '输入输出模块', '1F大厅配电间', 0, 0, 6),
(1, 1, 7, '1F大厅消防广播', '消防广播', '1F大厅', 0, 0, 7),
(1, 1, 8, '1F大厅防火卷帘', '防火卷帘', '1F大厅入口', 0, 0, 8),
(1, 2, 1, '1F走廊101室烟感', '烟感探测器', '1F走廊101室', 0, 0, 9),
(1, 2, 2, '1F走廊102室烟感', '烟感探测器', '1F走廊102室', 0, 0, 10),
(1, 2, 3, '1F走廊103室烟感', '烟感探测器', '1F走廊103室', 0, 0, 11),
(1, 2, 4, '1F走廊手报', '手动报警按钮', '1F走廊中部', 0, 0, 12),
(1, 2, 5, '1F走廊温感', '温感探测器', '1F走廊西端', 0, 0, 13),
(1, 2, 6, '1F走廊模块', '输入输出模块', '1F走廊配电间', 0, 0, 14),
(1, 2, 7, '1F走廊广播', '消防广播', '1F走廊', 0, 0, 15),
(1, 2, 8, '1F走廊排烟阀', '排烟阀', '1F走廊东端', 0, 0, 16),
(1, 3, 1, 'B1停车场A区烟感', '烟感探测器', 'B1停车场A区', 0, 0, 17),
(1, 3, 2, 'B1停车场B区烟感', '烟感探测器', 'B1停车场B区', 0, 0, 18),
(1, 3, 3, 'B1停车场温感', '温感探测器', 'B1停车场C区', 0, 0, 19),
(1, 3, 4, 'B1停车场手报', '手动报警按钮', 'B1停车场入口', 0, 0, 20),
(1, 3, 5, 'B1停车场可燃气体', '可燃气体探测器', 'B1停车场B区', 0, 0, 21),
(1, 3, 6, 'B1停车场声光报警', '声光报警器', 'B1停车场', 0, 0, 22),
(1, 3, 7, 'B1停车场模块', '输入输出模块', 'B1配电间', 0, 0, 23),
(1, 3, 8, 'B1停车场广播', '消防广播', 'B1停车场', 0, 0, 24),
(1, 4, 1, '2F办公区烟感1', '烟感探测器', '2F办公区东侧', 0, 0, 25),
(1, 4, 2, '2F办公区烟感2', '烟感探测器', '2F办公区西侧', 0, 0, 26),
(1, 4, 3, '2F办公区温感', '温感探测器', '2F办公区中央', 0, 0, 27),
(1, 4, 4, '2F办公区手报', '手动报警按钮', '2F办公区出口', 0, 0, 28),
(1, 4, 5, '2F办公区声光', '声光报警器', '2F办公区', 0, 0, 29),
(1, 4, 6, '2F办公区模块', '输入输出模块', '2F配电间', 0, 0, 30),
(1, 4, 7, '2F办公区广播', '消防广播', '2F办公区', 0, 0, 31),
(1, 4, 8, '2F办公区卷帘', '防火卷帘', '2F东楼梯间', 0, 0, 32);

-- 初始化视频监控
INSERT IGNORE INTO control_room_video (room_id, camera_name, camera_no, stream_url, protocol, status, position, sort_order) VALUES
('CR-001', '消控室主摄像头', 'CAM-001', '', 'HLS', 1, '消控室正门', 1),
('CR-001', '大厅全景摄像头', 'CAM-002', '', 'HLS', 1, '1F大厅中央', 2),
('CR-002', '消控室主摄像头', 'CAM-001', '', 'HLS', 1, '消控室正门', 1),
('CR-002', '车库入口摄像头', 'CAM-003', '', 'HLS', 1, 'B1车库入口', 2),
('CR-003', '消控室主摄像头', 'CAM-001', '', 'HLS', 1, '消控室正门', 1);

-- 初始化屏蔽记录示例
INSERT IGNORE INTO control_room_shield (room_id, host_id, point_name, device_type, location, loop_no, point_no, shield_reason, shield_by, status, created_at) VALUES
('CR-002', 1, '1F走廊温感', '温感探测器', '1F走廊西端', 2, 5, '装修施工，暂时屏蔽', 'admin', 1, '2026-04-15 09:00:00'),
('CR-002', 1, 'B1停车场手报', '手动报警按钮', 'B1停车场入口', 3, 4, '设备检修', 'admin', 1, '2026-04-10 14:30:00');

-- 初始化命令日志示例
INSERT IGNORE INTO control_room_command_log (host_id, room_id, command_type, command_value, command_time, command_by, result, point_name) VALUES
(1, 'CR-002', 'silence', 'silence', NOW(), 'admin', 1, NULL),
(1, 'CR-002', 'reset', 'reset', NOW(), 'admin', 1, NULL),
(1, 'CR-002', 'mode', 'auto', NOW(), 'admin', 1, NULL),
(1, 'CR-002', 'multiline_start', 'start', NOW(), 'admin', 1, '喷淋泵启动');
