"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchRecord = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 接警处置记录（与告警一一对应或一对多） ── */
exports.DispatchRecord = database_1.default.define('DispatchRecord', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    alarm_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, comment: '关联告警ID' },
    alarm_no: { type: sequelize_1.DataTypes.STRING(50), comment: '告警编号' },
    phase: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'receive', comment: '阶段：receive接警 verify核实 handling处置 archive归档' },
    status: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'pending', comment: '状态：new新告警 dispatched已派单 handling处置中 resolved已完成 false_alarm误报' },
    alarm_type: { type: sequelize_1.DataTypes.TINYINT, comment: '告警类型：1火警 2故障 3监管 4其他' },
    alarm_level: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1一般 2严重 3紧急' },
    handler_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    handler_name: sequelize_1.DataTypes.STRING(50),
    original_handler_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    original_handler_name: sequelize_1.DataTypes.STRING(50),
    dispatch_time: sequelize_1.DataTypes.DATE,
    verify_time: sequelize_1.DataTypes.DATE,
    resolve_time: sequelize_1.DataTypes.DATE,
    due_time: { type: sequelize_1.DataTypes.DATE, comment: '处置截止时间' },
    overdue_time: { type: sequelize_1.DataTypes.DATE, comment: '超时时间' },
    escalation_count: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '升级次数' },
    dispatch_note: sequelize_1.DataTypes.TEXT,
    verify_note: sequelize_1.DataTypes.TEXT,
    resolve_note: sequelize_1.DataTypes.TEXT,
    response_seconds: sequelize_1.DataTypes.INTEGER,
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_name: sequelize_1.DataTypes.STRING(200),
    device_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    device_name: sequelize_1.DataTypes.STRING(100),
    device_type: sequelize_1.DataTypes.STRING(50),
    location: sequelize_1.DataTypes.STRING(200),
    point_name: sequelize_1.DataTypes.STRING(100),
    notify_channels: { type: sequelize_1.DataTypes.TEXT, comment: '通知渠道JSON {sms,wechat,phone}' },
    push_status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0未推送 1已推送 2推送失败' },
}, {
    tableName: 'dispatch_record',
    timestamps: true,
    underscored: true,
    comment: '接警处置记录表',
    indexes: [
        { name: 'idx_alarm_id', fields: ['alarm_id'] },
        { name: 'idx_status', fields: ['status'] },
        { name: 'idx_phase', fields: ['phase'] },
        { name: 'idx_handler', fields: ['handler_id'] },
        { name: 'idx_created_at', fields: ['created_at'] },
        { name: 'idx_alarm_type', fields: ['alarm_type'] },
        { name: 'idx_due_time', fields: ['due_time'] },
    ],
});
//# sourceMappingURL=dispatchRecord.model.js.map