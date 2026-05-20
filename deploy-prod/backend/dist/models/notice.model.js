"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notice = void 0;
/**
 * notice.model.ts — 系统公告表 (notices)
 */
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
exports.Notice = database_1.default.define('notice', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: sequelize_1.DataTypes.STRING(256), allowNull: true, comment: '公告标题' },
    content: { type: sequelize_1.DataTypes.TEXT, allowNull: true, comment: '公告内容' },
    type: { type: sequelize_1.DataTypes.STRING(32), defaultValue: 'system', comment: '类型 system/emergency/maintenance/training' },
    priority: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 1, comment: '优先级 1低 2中 3高' },
    status: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 1, comment: '状态 0未发布 1已发布' },
    created_at: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW },
}, {
    tableName: 'notices',
    timestamps: false,
    indexes: [
        { name: 'idx_notice_type', fields: ['type'] },
        { name: 'idx_notice_status', fields: ['status'] },
        { name: 'idx_notice_priority', fields: ['priority'] },
    ],
});
//# sourceMappingURL=notice.model.js.map