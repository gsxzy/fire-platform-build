import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 1. 用户与权限 ── */
export const User = sequelize.define('user', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  real_name: { type: DataTypes.STRING(50), defaultValue: '' },
  phone: { type: DataTypes.STRING(20), defaultValue: '' },
  email: { type: DataTypes.STRING(100), defaultValue: '' },
  avatar: { type: DataTypes.STRING(255), defaultValue: '' },
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
  last_login: DataTypes.DATE,
  login_ip: DataTypes.STRING(50),
  dept_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
}, {
  tableName: 'sys_user',
  comment: '系统用户表',
  indexes: [
    { name: 'idx_dept_id', fields: ['dept_id'] },
    { name: 'idx_status', fields: ['status'] },
  ],
});

export const Role = sequelize.define('role', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  role_name: { type: DataTypes.STRING(50), allowNull: false },
  role_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  description: DataTypes.STRING(200),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
  sort: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'sys_role', comment: '角色表' });

export const Permission = sequelize.define('permission', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  perm_name: { type: DataTypes.STRING(50), allowNull: false },
  perm_code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  type: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1菜单 2按钮 3接口' },
  parent_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
  path: DataTypes.STRING(200),
  icon: DataTypes.STRING(50),
  sort: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, {
  tableName: 'sys_permission',
  comment: '权限表',
  indexes: [
    { name: 'idx_parent_id', fields: ['parent_id'] },
    { name: 'idx_type', fields: ['type'] },
  ],
});

export const UserRole = sequelize.define('user_role', {
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
}, {
  tableName: 'sys_user_role',
  comment: '用户角色关联',
  timestamps: false,
  indexes: [
    { unique: true, name: 'uk_user_role', fields: ['user_id', 'role_id'] },
  ],
});

export const RolePermission = sequelize.define('role_permission', {
  role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  perm_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
}, {
  tableName: 'sys_role_permission',
  comment: '角色权限关联',
  timestamps: false,
  indexes: [
    { unique: true, name: 'uk_role_perm', fields: ['role_id', 'perm_id'] },
  ],
});

export const Department = sequelize.define('department', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  dept_name: { type: DataTypes.STRING(100), allowNull: false },
  parent_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
  leader: DataTypes.STRING(50),
  phone: DataTypes.STRING(20),
  sort: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'sys_department', comment: '组织架构表' });

export const SystemLog = sequelize.define('system_log', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED },
  username: DataTypes.STRING(50),
  operation: { type: DataTypes.STRING(100), allowNull: false },
  method: DataTypes.STRING(10),
  path: DataTypes.STRING(255),
  ip: DataTypes.STRING(50),
  params: DataTypes.TEXT,
  result: DataTypes.TEXT,
  duration: DataTypes.INTEGER,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, {
  tableName: 'sys_log',
  comment: '系统日志表',
  indexes: [
    { name: 'idx_user_id', fields: ['user_id'] },
    { name: 'idx_created_at', fields: ['created_at'] },
  ],
});
