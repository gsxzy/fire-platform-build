"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyHandover = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 交接班记录表 ── */
exports.DutyHandover = database_1.default.define('DutyHandover', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    handover_no: { type: sequelize_1.DataTypes.STRING(50), comment: '交接班编号' },
    schedule_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, comment: '排班ID' },
    shift_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, comment: '班次ID' },
    shift_name: { type: sequelize_1.DataTypes.STRING(50), comment: '班次名称' },
    from_user_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, comment: '交班人ID' },
    from_user_name: { type: sequelize_1.DataTypes.STRING(50), comment: '交班人姓名' },
    to_user_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, comment: '接班人ID' },
    to_user_name: { type: sequelize_1.DataTypes.STRING(50), comment: '接班人姓名' },
    handover_time: { type: sequelize_1.DataTypes.DATE, comment: '交接时间' },
    accept_time: { type: sequelize_1.DataTypes.DATE, comment: '确认时间' },
    pending_alarm_count: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, comment: '未处置告警数' },
    pending_workorder_count: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, comment: '待办工单数' },
    abnormal_device_count: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, comment: '异常设备数' },
    handover_items: { type: sequelize_1.DataTypes.TEXT, comment: '交接事项JSON' },
    focus_items: { type: sequelize_1.DataTypes.TEXT, comment: '重点关注事项' },
    equipment_status: { type: sequelize_1.DataTypes.TEXT, comment: '设备状态摘要' },
    from_signature: { type: sequelize_1.DataTypes.STRING(255), comment: '交班人电子签名' },
    to_signature: { type: sequelize_1.DataTypes.STRING(255), comment: '接班人电子签名' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0待确认 1已确认' },
}, {
    tableName: 'fire_duty_handover',
    timestamps: true,
    underscored: true,
    comment: '交接班记录表',
    indexes: [
        { name: 'idx_schedule_id', fields: ['schedule_id'] },
        { name: 'idx_from_user', fields: ['from_user_id'] },
        { name: 'idx_to_user', fields: ['to_user_id'] },
        { name: 'idx_handover_time', fields: ['handover_time'] },
        { name: 'idx_status', fields: ['status'] },
    ],
});
//# sourceMappingURL=dutyHandover.model.js.map