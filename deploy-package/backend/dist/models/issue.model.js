"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueHistory = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 21. AI 故障自学习知识库 ── */
exports.IssueHistory = database_1.default.define('issue_history', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    device_id: { type: sequelize_1.DataTypes.STRING(64), allowNull: false, comment: '设备ID' },
    device_name: { type: sequelize_1.DataTypes.STRING(128), defaultValue: '', comment: '设备名称' },
    issue_type: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, comment: '故障类型: camera_offline/device_fault/network_error/sip_ban/etc' },
    symptoms: { type: sequelize_1.DataTypes.TEXT, comment: '症状描述' },
    root_cause: { type: sequelize_1.DataTypes.TEXT, comment: '根因分析' },
    solution: { type: sequelize_1.DataTypes.TEXT, comment: '解决方案' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0未解决 1已解决 2重复发生' },
    occurrence_count: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 1, comment: '累计发生次数' },
    source_ip: { type: sequelize_1.DataTypes.STRING(50), comment: '相关IP地址' },
    resolved_by: { type: sequelize_1.DataTypes.STRING(50), comment: '解决人' },
}, { tableName: 'fire_issue_history', comment: 'AI故障自学习知识库', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
//# sourceMappingURL=issue.model.js.map