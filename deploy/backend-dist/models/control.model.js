"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlCommand = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 12. 设备反控 ── */
exports.ControlCommand = database_1.default.define('control_command', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    cmd_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    device_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    device_name: sequelize_1.DataTypes.STRING(100),
    cmd_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1远程启停 2参数配置 3复位' },
    cmd_param: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0待执行 1执行中 2成功 3失败' },
    execute_time: sequelize_1.DataTypes.DATE,
    result: sequelize_1.DataTypes.TEXT,
    operator_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    operator_name: sequelize_1.DataTypes.STRING(50),
}, { tableName: 'fire_control_command', comment: '设备控制指令表' });
//# sourceMappingURL=control.model.js.map