"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyShiftDef = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 班次定义表 ── */
exports.DutyShiftDef = database_1.default.define('DutyShiftDef', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    shift_name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, comment: '班次名称' },
    start_time: { type: sequelize_1.DataTypes.TIME, allowNull: false, comment: '开始时间' },
    end_time: { type: sequelize_1.DataTypes.TIME, allowNull: false, comment: '结束时间' },
    rotation_type: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '轮班类型：1固定 2轮班 3临时' },
    sort_order: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '排序' },
    description: { type: sequelize_1.DataTypes.TEXT, comment: '描述' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '0停用 1启用' },
}, {
    tableName: 'fire_duty_shift',
    timestamps: true,
    underscored: true,
    comment: '班次定义表',
});
//# sourceMappingURL=dutyShift.model.js.map