"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Todo = void 0;
/**
 * todo.model.ts — 我的待办表 (todos)
 */
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
exports.Todo = database_1.default.define('todo', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: sequelize_1.DataTypes.STRING(256), allowNull: true, comment: '待办标题' },
    content: { type: sequelize_1.DataTypes.TEXT, allowNull: true, comment: '待办内容' },
    priority: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 1, comment: '优先级 1低 2中 3高' },
    status: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, comment: '状态 0待处理 1进行中 2已完成' },
    user_id: { type: sequelize_1.DataTypes.STRING(64), allowNull: true, comment: '指派用户ID' },
    due_date: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true, comment: '截止日期' },
    created_at: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW },
}, {
    tableName: 'todos',
    timestamps: false,
    indexes: [
        { name: 'idx_todo_user_status', fields: ['user_id', 'status'] },
        { name: 'idx_todo_status', fields: ['status'] },
        { name: 'idx_todo_due_date', fields: ['due_date'] },
    ],
});
//# sourceMappingURL=todo.model.js.map