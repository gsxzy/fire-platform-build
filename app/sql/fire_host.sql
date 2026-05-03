-- ============================================================
-- 智慧消防平台 - 报警主机/回路/设备点位 建表 SQL
-- 优化内容：
-- 1. 增加复合索引优化查询性能
-- 2. 增加自动更新触发器
-- 3. 增加统计视图
-- 4. 增加初始化数据
-- 5. 增加注释和分区建议
-- ============================================================

-- 1. fire_host 报警主机表
CREATE TABLE IF NOT EXISTS fire_host (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_code     VARCHAR(64)  NOT NULL COMMENT '主机编号',
  brand         VARCHAR(64)  DEFAULT NULL COMMENT '品牌',
  model         VARCHAR(64)  DEFAULT NULL COMMENT '型号',
  ip            VARCHAR(32)  DEFAULT NULL COMMENT 'IP地址',
  port          INT          DEFAULT 502 COMMENT '通信端口号',
  location      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0停用 1正常 2故障',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_code (host_code),
  INDEX idx_status (status),
  INDEX idx_brand (brand),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报警主机表';

-- 2. fire_loop 回路表
CREATE TABLE IF NOT EXISTS fire_loop (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '所属主机ID',
  loop_no       INT          NOT NULL COMMENT '回路编号',
  loop_name     VARCHAR(64)  DEFAULT NULL COMMENT '回路名称',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0停用 1正常',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_loop (host_id, loop_no),
  INDEX idx_host_id (host_id),
  INDEX idx_status (status),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回路表';

-- 3. fire_device 设备点位表
CREATE TABLE IF NOT EXISTS fire_device (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '所属主机ID',
  loop_no       INT          NOT NULL COMMENT '所属回路编号',
  address       INT          NOT NULL COMMENT '设备地址码',
  device_type   VARCHAR(64)  DEFAULT NULL COMMENT '设备类型：烟感/温感/手报等',
  location      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  remark        VARCHAR(256) DEFAULT NULL COMMENT '备注',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0停用 1正常 2故障 3报警',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_loop_addr (host_id, loop_no, address),
  INDEX idx_host_loop (host_id, loop_no),
  INDEX idx_device_type (device_type),
  INDEX idx_status (status),
  INDEX idx_location (location),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备点位表';

-- ============================================================
-- 触发器：确保 updated_at 自动更新（兼容旧版 MySQL）
-- ============================================================
DELIMITER //

DROP TRIGGER IF EXISTS trg_fire_host_updated_at//
CREATE TRIGGER trg_fire_host_updated_at
BEFORE UPDATE ON fire_host
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DROP TRIGGER IF EXISTS trg_fire_loop_updated_at//
CREATE TRIGGER trg_fire_loop_updated_at
BEFORE UPDATE ON fire_loop
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DROP TRIGGER IF EXISTS trg_fire_device_updated_at//
CREATE TRIGGER trg_fire_device_updated_at
BEFORE UPDATE ON fire_device
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- ============================================================
-- 统计视图
-- ============================================================

-- 主机统计视图
CREATE OR REPLACE VIEW v_fire_host_stats AS
SELECT 
  COUNT(*) AS total_hosts,
  SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS normal_hosts,
  SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS disabled_hosts,
  SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS fault_hosts,
  COUNT(DISTINCT brand) AS brand_count
FROM fire_host;

-- 回路统计视图
CREATE OR REPLACE VIEW v_fire_loop_stats AS
SELECT 
  f.host_id,
  h.host_code,
  h.brand,
  COUNT(*) AS total_loops,
  SUM(CASE WHEN f.status = 1 THEN 1 ELSE 0 END) AS normal_loops
FROM fire_loop f
JOIN fire_host h ON f.host_id = h.id
GROUP BY f.host_id, h.host_code, h.brand;

-- 设备统计视图
CREATE OR REPLACE VIEW v_fire_device_stats AS
SELECT 
  d.host_id,
  h.host_code,
  d.loop_no,
  COUNT(*) AS total_devices,
  SUM(CASE WHEN d.status = 1 THEN 1 ELSE 0 END) AS normal_devices,
  SUM(CASE WHEN d.status = 2 THEN 1 ELSE 0 END) AS fault_devices,
  SUM(CASE WHEN d.status = 3 THEN 1 ELSE 0 END) AS alarm_devices,
  COUNT(DISTINCT d.device_type) AS device_type_count
FROM fire_device d
JOIN fire_host h ON d.host_id = h.id
GROUP BY d.host_id, h.host_code, d.loop_no;

-- ============================================================
-- 初始化数据（可选，开发测试时使用）
-- ============================================================

-- 插入示例主机数据
INSERT IGNORE INTO fire_host (host_code, brand, model, ip, port, location, status) VALUES
('HOST-2024-001', '海湾', 'GST-5000', '192.168.1.101', 502, '万达广场消控室', 1),
('HOST-2024-002', '利达', 'LD-128E', '192.168.1.102', 502, '兰州中心消控室', 1),
('HOST-2024-003', '松江', 'JB-9108', '192.168.1.103', 502, '兰大二院消控室', 1),
('HOST-2024-004', '泰和安', 'TX3016', '192.168.1.104', 502, '西北师大消控室', 1),
('HOST-2024-005', '北大青鸟', 'JBF-11S', '192.168.1.105', 502, '兰州石化消控室', 1);

-- 插入示例回路数据
INSERT IGNORE INTO fire_loop (host_id, loop_no, loop_name, status) VALUES
(1, 1, '1F大厅回路', 1),
(1, 2, '1F走廊回路', 1),
(1, 3, 'B1停车场回路', 1),
(2, 1, '1F商业区回路', 1),
(2, 2, '2F办公区回路', 1),
(3, 1, '3F住院部回路', 1),
(3, 2, '急诊楼回路', 1),
(4, 1, '教学楼回路', 1),
(5, 1, '生产车间回路', 1),
(5, 2, '储罐区回路', 1);

-- 插入示例设备点位数据
INSERT IGNORE INTO fire_device (host_id, loop_no, address, device_type, location, remark, status) VALUES
(1, 1, 1, '烟感探测器', '1F大厅东侧', '', 1),
(1, 1, 2, '烟感探测器', '1F大厅西侧', '', 1),
(1, 1, 3, '温感探测器', '1F大厅中央', '', 1),
(1, 1, 4, '手动报警按钮', '1F大厅出口', '', 1),
(1, 2, 1, '烟感探测器', '1F走廊101室', '', 1),
(1, 2, 2, '烟感探测器', '1F走廊102室', '', 1),
(1, 3, 1, '温感探测器', 'B1停车场A区', '', 1),
(1, 3, 2, '可燃气体探测器', 'B1停车场B区', '', 1),
(2, 1, 1, '烟感探测器', '1F商业区入口', '', 1),
(2, 1, 2, '声光报警器', '1F商业区中庭', '', 1),
(3, 1, 1, '烟感探测器', '3F住院部301床', '', 1),
(3, 1, 2, '手动报警按钮', '3F护士站', '', 1),
(5, 1, 1, '火焰探测器', '生产车间A线', '', 1),
(5, 2, 1, '可燃气体探测器', '储罐区1号罐', '', 1);


-- 4. users 用户表
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)  PRIMARY KEY COMMENT '用户ID',
  username      VARCHAR(64)  NOT NULL COMMENT '用户名',
  password      VARCHAR(128) NOT NULL COMMENT '密码',
  real_name     VARCHAR(64)  DEFAULT NULL COMMENT '真实姓名',
  phone         VARCHAR(20)  DEFAULT NULL COMMENT '手机号',
  email         VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
  avatar        VARCHAR(256) DEFAULT NULL COMMENT '头像URL',
  roles         VARCHAR(128) DEFAULT 'operator' COMMENT '角色',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0禁用 1正常',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 插入默认管理员
INSERT IGNORE INTO users (id, username, password, real_name, roles, status) VALUES
(UUID(), 'admin', 'admin123', '系统管理员', 'admin', 1),
(UUID(), 'operator', 'op123456', '值班操作员', 'operator', 1);
