/**
 * notice.model.ts — 系统公告表 (notices)
 */
import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

export const Notice = sequelize.define('notice', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(256), allowNull: true, comment: '公告标题' },
  content: { type: DataTypes.TEXT, allowNull: true, comment: '公告内容' },
  type: { type: DataTypes.STRING(32), defaultValue: 'system', comment: '类型 system/emergency/maintenance/training' },
  priority: { type: DataTypes.INTEGER, defaultValue: 1, comment: '优先级 1低 2中 3高' },
  status: { type: DataTypes.INTEGER, defaultValue: 1, comment: '状态 0未发布 1已发布' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'sys_notice',
  timestamps: false,
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['priority'] },
  ],
});
