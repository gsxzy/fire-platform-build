import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 21. AI 故障自学习知识库 ── */
export const IssueHistory = sequelize.define('issue_history', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  device_id: { type: DataTypes.STRING(64), allowNull: false, comment: '设备ID' },
  device_name: { type: DataTypes.STRING(128), defaultValue: '', comment: '设备名称' },
  issue_type: { type: DataTypes.STRING(50), allowNull: false, comment: '故障类型: camera_offline/device_fault/network_error/sip_ban/etc' },
  symptoms: { type: DataTypes.TEXT, comment: '症状描述' },
  root_cause: { type: DataTypes.TEXT, comment: '根因分析' },
  solution: { type: DataTypes.TEXT, comment: '解决方案' },
  status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0未解决 1已解决 2重复发生' },
  occurrence_count: { type: DataTypes.INTEGER, defaultValue: 1, comment: '累计发生次数' },
  source_ip: { type: DataTypes.STRING(50), comment: '相关IP地址' },
  resolved_by: { type: DataTypes.STRING(50), comment: '解决人' },
}, { tableName: 'fire_issue_history', comment: 'AI故障自学习知识库', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
