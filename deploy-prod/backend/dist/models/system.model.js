"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenWidget = exports.ScreenConfig = exports.NotifyTemplate = exports.SystemConfig = exports.Personnel = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 17. 人员管理 ── */
exports.Personnel = database_1.default.define('personnel', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    phone: { type: sequelize_1.DataTypes.STRING(20), defaultValue: '' },
    role: { type: sequelize_1.DataTypes.STRING(32), defaultValue: 'operator', comment: 'manager|duty_officer|safety_officer|operator|inspector' },
    unit_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
    unit_name: { type: sequelize_1.DataTypes.STRING(100), defaultValue: '' },
    cert_type: { type: sequelize_1.DataTypes.STRING(50), defaultValue: '' },
    cert_no: { type: sequelize_1.DataTypes.STRING(50), defaultValue: '' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
}, {
    tableName: 'sys_personnel',
    comment: '系统人员表',
    indexes: [
        { name: 'idx_role', fields: ['role'] },
        { name: 'idx_unit_id', fields: ['unit_id'] },
        { name: 'idx_status', fields: ['status'] },
    ],
});
/* ── 18. 系统配置 ── */
exports.SystemConfig = database_1.default.define('system_config', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    config_key: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, unique: true },
    config_value: sequelize_1.DataTypes.TEXT,
    description: sequelize_1.DataTypes.STRING(200),
}, { tableName: 'sys_config', comment: '系统配置表' });
/* ── 19. 通知模板 ── */
exports.NotifyTemplate = database_1.default.define('notify_template', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    template_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    template_code: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    channel: { type: sequelize_1.DataTypes.STRING(20), comment: 'sms/email/app/wechat' },
    subject: sequelize_1.DataTypes.STRING(200),
    content: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'sys_notify_template', comment: '通知模板表' });
/* ── 20. 大屏配置 ── */
exports.ScreenConfig = database_1.default.define('screen_config', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    screen_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    layout_config: sequelize_1.DataTypes.TEXT('long'),
    widget_config: sequelize_1.DataTypes.TEXT('long'),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_screen_config', comment: '大屏配置表' });
/* ── 20.1 大屏组件 ── */
exports.ScreenWidget = database_1.default.define('screen_widget', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    screen_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    widget_type: { type: sequelize_1.DataTypes.STRING(32), comment: 'alarm_stat|device_map|subsystem|trend|rank|pie|recent' },
    widget_name: sequelize_1.DataTypes.STRING(100),
    config: sequelize_1.DataTypes.TEXT('long'),
    position_x: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    position_y: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    width: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 4 },
    height: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 2 },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, {
    tableName: 'fire_screen_widget',
    comment: '大屏组件表',
    indexes: [{ name: 'idx_screen_id', fields: ['screen_id'] }],
});
//# sourceMappingURL=system.model.js.map