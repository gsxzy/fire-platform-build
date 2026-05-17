"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemLog = exports.Department = exports.RolePermission = exports.UserRole = exports.Permission = exports.Role = exports.User = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 1. 用户与权限 ── */
exports.User = database_1.default.define('user', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    username: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    password: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    real_name: { type: sequelize_1.DataTypes.STRING(50), defaultValue: '' },
    phone: { type: sequelize_1.DataTypes.STRING(20), defaultValue: '' },
    email: { type: sequelize_1.DataTypes.STRING(100), defaultValue: '' },
    avatar: { type: sequelize_1.DataTypes.STRING(255), defaultValue: '' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
    last_login: sequelize_1.DataTypes.DATE,
    login_ip: sequelize_1.DataTypes.STRING(50),
    dept_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
}, {
    tableName: 'sys_user',
    comment: '系统用户表',
    indexes: [
        { name: 'idx_dept_id', fields: ['dept_id'] },
        { name: 'idx_status', fields: ['status'] },
    ],
});
exports.Role = database_1.default.define('role', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    role_name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    role_code: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    description: sequelize_1.DataTypes.STRING(200),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
    sort: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'sys_role', comment: '角色表' });
exports.Permission = database_1.default.define('permission', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    perm_name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    perm_code: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, unique: true },
    type: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1菜单 2按钮 3接口' },
    parent_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
    path: sequelize_1.DataTypes.STRING(200),
    icon: sequelize_1.DataTypes.STRING(50),
    sort: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, {
    tableName: 'sys_permission',
    comment: '权限表',
    indexes: [
        { name: 'idx_parent_id', fields: ['parent_id'] },
        { name: 'idx_type', fields: ['type'] },
    ],
});
exports.UserRole = database_1.default.define('user_role', {
    user_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false },
    role_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false },
}, {
    tableName: 'sys_user_role',
    comment: '用户角色关联',
    timestamps: false,
    indexes: [
        { unique: true, name: 'uk_user_role', fields: ['user_id', 'role_id'] },
    ],
});
exports.RolePermission = database_1.default.define('role_permission', {
    role_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false },
    perm_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false },
}, {
    tableName: 'sys_role_permission',
    comment: '角色权限关联',
    timestamps: false,
    indexes: [
        { unique: true, name: 'uk_role_perm', fields: ['role_id', 'perm_id'] },
    ],
});
exports.Department = database_1.default.define('department', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    dept_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    parent_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
    leader: sequelize_1.DataTypes.STRING(50),
    phone: sequelize_1.DataTypes.STRING(20),
    sort: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'sys_department', comment: '组织架构表' });
exports.SystemLog = database_1.default.define('system_log', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED },
    username: sequelize_1.DataTypes.STRING(50),
    operation: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    method: sequelize_1.DataTypes.STRING(10),
    path: sequelize_1.DataTypes.STRING(255),
    ip: sequelize_1.DataTypes.STRING(50),
    params: sequelize_1.DataTypes.TEXT,
    result: sequelize_1.DataTypes.TEXT,
    duration: sequelize_1.DataTypes.INTEGER,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, {
    tableName: 'sys_log',
    comment: '系统日志表',
    indexes: [
        { name: 'idx_user_id', fields: ['user_id'] },
        { name: 'idx_created_at', fields: ['created_at'] },
    ],
});
//# sourceMappingURL=auth.model.js.map