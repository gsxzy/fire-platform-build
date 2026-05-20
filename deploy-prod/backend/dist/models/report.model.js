"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportSchedule = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
exports.ReportSchedule = database_1.default.define('report_schedule', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    report_name: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
    report_type: { type: sequelize_1.DataTypes.STRING(32), allowNull: false, comment: 'daily|weekly|monthly|device|maintenance|patrol' },
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    cron_expr: { type: sequelize_1.DataTypes.STRING(50), defaultValue: '0 8 * * *', comment: 'Cron 表达式' },
    recipients: sequelize_1.DataTypes.TEXT,
    format: { type: sequelize_1.DataTypes.STRING(10), defaultValue: 'xlsx', comment: 'csv|xlsx' },
    last_run_at: sequelize_1.DataTypes.DATE,
    last_run_status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0未执行 1成功 2失败' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1启用 0停用' },
}, {
    tableName: 'report_schedule',
    comment: '定时报表任务表',
    timestamps: true,
    underscored: true,
});
//# sourceMappingURL=report.model.js.map