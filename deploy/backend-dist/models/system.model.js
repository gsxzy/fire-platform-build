"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenConfig = exports.NotifyTemplate = exports.SystemConfig = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
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
//# sourceMappingURL=system.model.js.map