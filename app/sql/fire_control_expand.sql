-- ============================================================
-- 智慧消防平台 - 消控室监控扩展表
-- 新增：物联网传感器、控制命令日志、屏蔽记录、反馈记录、多线盘、总线盘
-- ============================================================

-- 4. iot_sensor 物联网传感器配置表
CREATE TABLE IF NOT EXISTS iot_sensor (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '所属主机ID',
  sensor_code   VARCHAR(64)  NOT NULL COMMENT '传感器编号',
  sensor_type   VARCHAR(32)  NOT NULL COMMENT '传感器类型：pressure(压力)|level(液位)|temp(温度)|humidity(湿度)',
  sensor_name   VARCHAR(64)  DEFAULT NULL COMMENT '传感器名称',
  unit          VARCHAR(16)  DEFAULT NULL COMMENT '单位：Mpa|m|℃|%',
  min_value     DECIMAL(10,3) DEFAULT 0 COMMENT '量程下限',
  max_value     DECIMAL(10,3) DEFAULT 100 COMMENT '量程上限',
  alarm_low     DECIMAL(10,3) DEFAULT NULL COMMENT '低限报警值',
  alarm_high    DECIMAL(10,3) DEFAULT NULL COMMENT '高限报警值',
  location      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0停用 1正常 2故障',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_sensor (host_id, sensor_code),
  INDEX idx_sensor_type (sensor_type),
  INDEX idx_status (status),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物联网传感器配置表';

-- 5. iot_sensor_data 传感器实时数据表
CREATE TABLE IF NOT EXISTS iot_sensor_data (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  sensor_id     BIGINT       NOT NULL COMMENT '传感器ID',
  sensor_value  DECIMAL(10,3) NOT NULL COMMENT '传感器数值',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0离线 1正常 2低报警 3高报警 4故障',
  record_time   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
  INDEX idx_sensor_time (sensor_id, record_time),
  INDEX idx_status (status),
  FOREIGN KEY (sensor_id) REFERENCES iot_sensor(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='传感器实时数据表';

-- 6. control_command_log 远程控制命令日志表
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

-- 7. shield_record 屏蔽记录表
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

-- 8. feedback_record 反馈记录表
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

-- 9. host_multiline 多线盘配置表
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

-- 10. host_bus_point 总线点位配置表
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

-- ============================================================
-- 初始化数据
-- ============================================================

-- 初始化物联网传感器（为每个主机创建压力和液位传感器）
INSERT IGNORE INTO iot_sensor (host_id, sensor_code, sensor_type, sensor_name, unit, min_value, max_value, alarm_low, alarm_high, location, status) VALUES
(1, 'P-001', 'pressure', '管网压力传感器', 'Mpa', 0, 1.6, 0.15, 1.2, '万达广场水泵房', 1),
(1, 'L-001', 'level', '消防水箱液位计', 'm', 0, 5, 0.5, 4.5, '万达广场屋顶水箱', 1),
(1, 'P-002', 'pressure', '喷淋压力传感器', 'Mpa', 0, 1.6, 0.15, 1.2, '万达广场喷淋泵房', 1),
(1, 'L-002', 'level', '消防水池液位计', 'm', 0, 10, 1.0, 9.0, '万达广场地下水池', 1),
(2, 'P-001', 'pressure', '管网压力传感器', 'Mpa', 0, 1.6, 0.15, 1.2, '兰州中心水泵房', 1),
(2, 'L-001', 'level', '消防水箱液位计', 'm', 0, 5, 0.5, 4.5, '兰州中心屋顶水箱', 1),
(3, 'P-001', 'pressure', '管网压力传感器', 'Mpa', 0, 1.6, 0.15, 1.2, '兰大二院水泵房', 1),
(3, 'L-001', 'level', '消防水箱液位计', 'm', 0, 5, 0.5, 4.5, '兰大二院屋顶水箱', 1),
(4, 'P-001', 'pressure', '管网压力传感器', 'Mpa', 0, 1.6, 0.15, 1.2, '西北师大水泵房', 1),
(4, 'L-001', 'level', '消防水箱液位计', 'm', 0, 5, 0.5, 4.5, '西北师大屋顶水箱', 1),
(5, 'P-001', 'pressure', '管网压力传感器', 'Mpa', 0, 1.6, 0.15, 1.2, '兰州石化水泵房', 1),
(5, 'L-001', 'level', '消防水箱液位计', 'm', 0, 5, 0.5, 4.5, '兰州石化屋顶水箱', 1);

-- 初始化多线盘配置（每个主机5路）
INSERT IGNORE INTO host_multiline (host_id, point_no, point_name, device_type, status, feedback_status, fault_status, location, sort_order) VALUES
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

-- 初始化总线点位（每个主机32个点）
-- 使用存储过程或批量插入，这里简化为主机1的32个点
INSERT IGNORE INTO host_bus_point (host_id, loop_no, point_no, point_name, device_type, install_location, status, sort_order) VALUES
(1, 1, 1, '1F大厅东侧烟感', '烟感探测器', '1F大厅东侧', 0, 1),
(1, 1, 2, '1F大厅西侧烟感', '烟感探测器', '1F大厅西侧', 0, 2),
(1, 1, 3, '1F大厅中央温感', '温感探测器', '1F大厅中央', 0, 3),
(1, 1, 4, '1F大厅出口手报', '手动报警按钮', '1F大厅出口', 0, 4),
(1, 1, 5, '1F大厅声光报警', '声光报警器', '1F大厅', 0, 5),
(1, 1, 6, '1F大厅输入输出', '输入输出模块', '1F大厅配电间', 0, 6),
(1, 1, 7, '1F大厅消防广播', '消防广播', '1F大厅', 0, 7),
(1, 1, 8, '1F大厅防火卷帘', '防火卷帘', '1F大厅入口', 0, 8),
(1, 2, 1, '1F走廊101室烟感', '烟感探测器', '1F走廊101室', 0, 9),
(1, 2, 2, '1F走廊102室烟感', '烟感探测器', '1F走廊102室', 0, 10),
(1, 2, 3, '1F走廊103室烟感', '烟感探测器', '1F走廊103室', 0, 11),
(1, 2, 4, '1F走廊手报', '手动报警按钮', '1F走廊中部', 0, 12),
(1, 2, 5, '1F走廊温感', '温感探测器', '1F走廊西端', 0, 13),
(1, 2, 6, '1F走廊模块', '输入输出模块', '1F走廊配电间', 0, 14),
(1, 2, 7, '1F走廊广播', '消防广播', '1F走廊', 0, 15),
(1, 2, 8, '1F走廊排烟阀', '排烟阀', '1F走廊东端', 0, 16),
(1, 3, 1, 'B1停车场A区烟感', '烟感探测器', 'B1停车场A区', 0, 17),
(1, 3, 2, 'B1停车场B区烟感', '烟感探测器', 'B1停车场B区', 0, 18),
(1, 3, 3, 'B1停车场温感', '温感探测器', 'B1停车场C区', 0, 19),
(1, 3, 4, 'B1停车场手报', '手动报警按钮', 'B1停车场入口', 0, 20),
(1, 3, 5, 'B1停车场可燃气体', '可燃气体探测器', 'B1停车场B区', 0, 21),
(1, 3, 6, 'B1停车场声光报警', '声光报警器', 'B1停车场', 0, 22),
(1, 3, 7, 'B1停车场模块', '输入输出模块', 'B1配电间', 0, 23),
(1, 3, 8, 'B1停车场广播', '消防广播', 'B1停车场', 0, 24),
(1, 4, 1, '2F办公区烟感1', '烟感探测器', '2F办公区东侧', 0, 25),
(1, 4, 2, '2F办公区烟感2', '烟感探测器', '2F办公区西侧', 0, 26),
(1, 4, 3, '2F办公区温感', '温感探测器', '2F办公区中央', 0, 27),
(1, 4, 4, '2F办公区手报', '手动报警按钮', '2F办公区出口', 0, 28),
(1, 4, 5, '2F办公区声光', '声光报警器', '2F办公区', 0, 29),
(1, 4, 6, '2F办公区模块', '输入输出模块', '2F配电间', 0, 30),
(1, 4, 7, '2F办公区广播', '消防广播', '2F办公区', 0, 31),
(1, 4, 8, '2F办公区卷帘', '防火卷帘', '2F东楼梯间', 0, 32);

-- 初始化屏蔽记录示例
INSERT IGNORE INTO shield_record (host_id, loop_no, point_no, point_name, device_type, location, shield_reason, operator, status, shield_time) VALUES
(1, 2, 5, '1F走廊温感', '温感探测器', '1F走廊西端', '装修施工，暂时屏蔽', 'admin', 1, '2026-04-15 09:00:00'),
(1, 3, 4, 'B1停车场手报', '手动报警按钮', 'B1停车场入口', '设备检修', 'admin', 1, '2026-04-10 14:30:00');

-- 初始化反馈记录示例
INSERT IGNORE INTO feedback_record (host_id, device_name, device_type, location, feedback_type, feedback_desc, loop_no, point_no, status) VALUES
(1, '控制器', '报警主机', '1F消防控制室', 'reset', '控制器复位', NULL, NULL, 1),
(1, '讯响器', '声光报警器', '1F大厅', 'start', '手动启动', 1, 5, 1),
(1, '消防泵', '消防泵', 'B1水泵房', 'start', '手动启动', NULL, 2, 1),
(1, '排烟风机', '排烟风机', '楼顶风机房', 'stop', '手动停止', NULL, 3, 1);

-- 初始化命令日志示例
INSERT IGNORE INTO control_command_log (host_id, room_id, command_type, command_desc, point_id, point_name, old_value, new_value, operator, result, result_msg) VALUES
(1, 'CR-002', 'silence', '远程消音', NULL, NULL, '未消音', '已消音', 'admin', 1, '消音成功'),
(1, 'CR-002', 'reset', '设备复位', NULL, NULL, '报警中', '正常', 'admin', 1, '复位成功'),
(1, 'CR-002', 'mode', '模式切换', NULL, NULL, '手动', '自动', 'admin', 1, '切换成功'),
(1, 'CR-002', 'multiline_start', '多线启动', 1, '喷淋泵启动', '停止', '启动', 'admin', 1, '启动成功');
