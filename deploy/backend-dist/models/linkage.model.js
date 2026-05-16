"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkageRule = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 13. 安消联动 ── */
exports.LinkageRule = database_1.default.define('linkage_rule', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    rule_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    trigger_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1告警触发 2手动触发 3定时触发' },
    trigger_device_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    trigger_condition: sequelize_1.DataTypes.TEXT,
    action_devices: sequelize_1.DataTypes.TEXT,
    action_commands: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_linkage_rule', comment: '联动规则表' });
//# sourceMappingURL=linkage.model.js.map