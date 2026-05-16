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
    shift_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1早班 2中班 3晚班' },
    start_time: sequelize_1.DataTypes.TIME,
    end_time: sequelize_1.DataTypes.TIME,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, {
    tableName: 'fire_duty_schedule',
    comment: '值班排班表',
    indexes: [
        { name: 'idx_user_id', fields: ['user_id'] },
        { name: 'idx_duty_date', fields: ['duty_date'] },
    ],
});
exports.DutyLog = database_1.default.define('duty_log', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    user_name: sequelize_1.DataTypes.STRING(50),
    on_duty_time: sequelize_1.DataTypes.DATE,
    off_duty_time: sequelize_1.DataTypes.DATE,
    handover_content: sequelize_1.DataTypes.TEXT,
    incidents: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_duty_log', comment: '值班日志表' });
//# sourceMappingURL=duty.model.js.map