import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 17. 消防检查 ── */
export const FireInspection = sequelize.define('fire_inspection', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  inspect_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  inspect_type: { type: DataTypes.TINYINT, comment: '1日常检查 2专项检查 3联合检查' },
  inspector: DataTypes.STRING(50),
  inspect_date: DataTypes.DATE,
  items: DataTypes.TEXT,
  result: { type: DataTypes.TINYINT, comment: '1合格 2不合格 3限期整改' },
  photos: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_inspection', comment: '消防检查表' });
