-- 角色表
CREATE TABLE IF NOT EXISTS sys_role (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_code VARCHAR(64) NOT NULL UNIQUE COMMENT '角色编码',
  role_name VARCHAR(128) NOT NULL COMMENT '角色名称',
  description VARCHAR(512) DEFAULT NULL COMMENT '角色描述',
  status TINYINT DEFAULT 1 COMMENT '状态: 0=禁用 1=启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统角色表';

-- 权限表
CREATE TABLE IF NOT EXISTS sys_permission (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  perm_code VARCHAR(128) NOT NULL UNIQUE COMMENT '权限编码',
  perm_name VARCHAR(128) NOT NULL COMMENT '权限名称',
  perm_type VARCHAR(32) NOT NULL COMMENT '权限类型: menu/button/api',
  parent_id BIGINT DEFAULT 0 COMMENT '父权限ID',
  path VARCHAR(256) DEFAULT NULL COMMENT '前端路由路径',
  component VARCHAR(256) DEFAULT NULL COMMENT '前端组件路径',
  icon VARCHAR(128) DEFAULT NULL COMMENT '图标',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id),
  INDEX idx_perm_type (perm_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统权限表';

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS sys_role_permission (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id BIGINT NOT NULL COMMENT '角色ID',
  permission_id BIGINT NOT NULL COMMENT '权限ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_role_perm (role_id, permission_id),
  INDEX idx_role_id (role_id),
  INDEX idx_permission_id (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS sys_user_role (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
  role_id BIGINT NOT NULL COMMENT '角色ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_role (user_id, role_id),
  INDEX idx_user_id (user_id),
  INDEX idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

-- 数据权限表（单位数据权限）
CREATE TABLE IF NOT EXISTS sys_data_scope (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
  unit_id VARCHAR(64) DEFAULT NULL COMMENT '单位ID',
  scope_type VARCHAR(32) DEFAULT 'all' COMMENT '权限范围: all=全部 custom=自定义 self=仅本人 dept=本部门',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据权限表';

-- 插入初始数据
INSERT INTO sys_role (role_code, role_name, description) VALUES
('super_admin', '超级管理员', '拥有所有权限'),
('admin', '管理员', '拥有单位管理权限'),
('operator', '操作员', '拥有日常操作权限'),
('viewer', '查看者', '仅有查看权限')
ON DUPLICATE KEY UPDATE role_name=VALUES(role_name);

INSERT INTO sys_permission (perm_code, perm_name, perm_type, path, component, sort_order) VALUES
('system', '系统管理', 'menu', '/system', null, 100),
('system:user', '用户管理', 'menu', '/system/users', 'UserList', 101),
('system:user:create', '创建用户', 'button', null, null, 102),
('system:user:update', '更新用户', 'button', null, null, 103),
('system:user:delete', '删除用户', 'button', null, null, 104),
('system:role', '角色管理', 'menu', '/system/roles', 'RoleList', 105),
('system:role:create', '创建角色', 'button', null, null, 106),
('system:role:update', '更新角色', 'button', null, null, 107),
('system:role:delete', '删除角色', 'button', null, null, 108),
('alarm', '告警中心', 'menu', '/alarm', null, 200),
('alarm:view', '查看告警', 'button', null, null, 201),
('alarm:handle', '处理告警', 'button', null, null, 202),
('alarm:confirm', '确认告警', 'button', null, null, 203),
('device', '设备管理', 'menu', '/device', null, 300),
('device:view', '查看设备', 'button', null, null, 301),
('device:control', '远程控制', 'button', null, null, 302),
('control', '消控室', 'menu', '/control', null, 400),
('control:mute', '消音', 'button', null, null, 401),
('control:reset', '复位', 'button', null, null, 402)
ON DUPLICATE KEY UPDATE perm_name=VALUES(perm_name);

-- 超级管理员拥有所有权限
INSERT INTO sys_role_permission (role_id, permission_id)
SELECT 1, id FROM sys_permission
ON DUPLICATE KEY UPDATE role_id=role_id;
