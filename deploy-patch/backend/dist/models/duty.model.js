"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyLog = exports.DutySchedule = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 7. 值守中心 ── */
exports.DutySchedule = database_1.default.define('duty_schedule', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    user_name: sequelize_1.DataTypes.STRING(50),
    duty_date: sequelize_1.DataTypes.DATEONLY,
    shift_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, comment: '关联班次定义ID' },
    shift_name: { type: sequelize_1.DataTypes.STRING(50), comment: '班次名称冗余' },
    shift_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1早班 2中班 3晚班（兼容旧数据）' },
    start_time: sequelize_1.DataTypes.TIME,
    end_time: sequelize_1.DataTypes.TIME,
    remark: { type: sequelize_1.DataTypes.STRING(500), comment: '备注' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '0停用 1启用' },
}, {
    tableName: 'fire_duty_schedule',
    comment: '值班排班表',
    indexes: [
        { name: 'idx_user_id', fields: ['user_id'] },
        { name: 'idx_duty_date', fields: ['duty_date'] },
        { name: 'idx_shift_id', fields: ['shift_id'] },
    ],
});
exports.DutyLog = database_1.default.define('duty_log', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    log_no: { type: sequelize_1.DataTypes.STRING(50), comment: '日志编号' },
    schedule_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, comment: '排班ID' },
    user_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    user_name: sequelize_1.DataTypes.STRING(50),
    event_type: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1系统自动 2手动记录' },
    event_source: { type: sequelize_1.DataTypes.STRING(50), comment: '事件来源：alarm/disposal/patrol/manual' },
    source_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, comment: '来源记录ID' },
    content: { type: sequelize_1.DataTypes.TEXT, comment: '事件内容' },
    attachments: { type: sequelize_1.DataTypes.TEXT, comment: '附件JSON [{name,url}]' },
    on_duty_time: sequelize_1.DataTypes.DATE,
    off_duty_time: sequelize_1.DataTypes.DATE,
    handover_content: sequelize_1.DataTypes.TEXT,
    incidents: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, {
    tableName: 'fire_duty_log',
    comment: '值班日志表',
    indexes: [
        { name: 'idx_schedule_id', fields: ['schedule_id'] },
        { name: 'idx_user_id', fields: ['user_id'] },
        { name: 'idx_event_type', fields: ['event_type'] },
        { name: 'idx_created_at', fields: ['created_at'] },
    ],
});
//# sourceMappingURL=duty.model.js.map