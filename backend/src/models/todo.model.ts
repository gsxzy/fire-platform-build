/**
 * todo.model.ts — 我的待办表 (todos)
 */
import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

export const Todo = sequelize.define('todo', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(256), allowNull: true, comment: '待办标题' },
  content: { type: DataTypes.TEXT, allowNull: true, comment: '待办内容' },
  priority: { type: DataTypes.INTEGER, defaultValue: 1, comment: '优先级 1低 2中 3高' },
  status: { type: DataTypes.INTEGER, defaultValue: 0, comment: '状态 0待处理 1进行中 2已完成' },
  user_id: { type: DataTypes.STRING(64), allowNull: true, comment: '指派用户ID' },
  due_date: { type: DataTypes.DATEONLY, allowNull: true, comment: '截止日期' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'sys_todo',
  timestamps: false,
  indexes: [
    { fields: ['user_id', 'status'] },
    { fields: ['status'] },
    { fields: ['due_date'] },
  ],
});
