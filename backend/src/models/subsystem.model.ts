import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 子系统配置表 ── */
export const Subsystem = sequelize.define('Subsystem', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: '子系统名称' },
  type: { type: DataTypes.STRING(32), allowNull: false, comment: '类型标识：water/elec/vent/light/audio/door/gas' },
  device_type_tags: { type: DataTypes.JSONB, comment: '关联设备类型关键词 ["水压","液位"]' },
  description: DataTypes.TEXT,
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '0禁用 1启用' },
}, {
  tableName: 'subsystems',
  timestamps: true,
  underscored: true,
  comment: '子系统配置表',
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
  ],
});
