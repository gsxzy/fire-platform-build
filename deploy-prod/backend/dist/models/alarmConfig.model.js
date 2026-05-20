"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmNotifyPolicy = exports.AlarmThreshold = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 告警阈值规则（IoT 传感器数据阈值） ── */
exports.AlarmThreshold = database_1.default.define('AlarmThreshold', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, comment: '规则名称' },
    device_type: { type: sequelize_1.DataTypes.STRING(50), comment: '设备类型（为空则匹配全部）' },
    metric_type: { type: sequelize_1.DataTypes.STRING(32), allowNull: false, comment: '指标类型：temperature/pressure/level/smoke/voltage/current' },
    operator: { type: sequelize_1.DataTypes.STRING(10), allowNull: false, defaultValue: '>', comment: '比较运算符：> >= < <= ==' },
    threshold_value: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false, comment: '阈值' },
    duration_seconds: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, comment: '持续多少秒才触发（0表示立即）' },
    alarm_type: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 3, comment: '触发告警类型：1火警 2故障 3预警' },
    alarm_level: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 2, comment: '触发告警级别：1一般 2严重 3紧急' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
}, {
    tableName: 'alarm_threshold',
    timestamps: true,
    underscored: true,
    comment: '告警阈值规则表',
    indexes: [
        { name: 'idx_metric_status', fields: ['metric_type', 'status'] },
        { name: 'idx_device_type', fields: ['device_type'] },
    ],
});
/* ── 告警通知策略 ── */
exports.AlarmNotifyPolicy = database_1.default.define('AlarmNotifyPolicy', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, comment: '策略名称' },
    alarm_types: { type: sequelize_1.DataTypes.JSON, comment: '适用告警类型 [1,2,3]' },
    alarm_levels: { type: sequelize_1.DataTypes.JSON, comment: '适用告警级别 [1,2,3]' },
    channels: { type: sequelize_1.DataTypes.JSON, comment: '通知渠道 {sms:true, email:true, app:true, voice:false}' },
    targets: { type: sequelize_1.DataTypes.JSON, comment: '通知对象 [{type:"role",value:"duty"},{type:"user",value:"123"}]' },
    escalation_enabled: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '是否启用升级 0否 1是' },
    escalation_minutes: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 5, comment: '升级触发时间（分钟）' },
    escalation_targets: { type: sequelize_1.DataTypes.JSON, comment: '升级通知对象' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
}, {
    tableName: 'alarm_notify_policy',
    timestamps: true,
    underscored: true,
    comment: '告警通知策略表',
    indexes: [
        { name: 'idx_status', fields: ['status'] },
    ],
});
//# sourceMappingURL=alarmConfig.model.js.map