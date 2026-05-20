import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 班次定义表 ── */
export const DutyShiftDef = sequelize.define('DutyShiftDef', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  shift_name: { type: DataTypes.STRING(50), allowNull: false, comment: '班次名称' },
  start_time: { type: DataTypes.TIME, allowNull: false, comment: '开始时间' },
  end_time: { type: DataTypes.TIME, allowNull: false, comment: '结束时间' },
  rotation_type: { type: DataTypes.TINYINT, defaultValue: 1, comment: '轮班类型：1固定 2轮班 3临时' },
  sort_order: { type: DataTypes.TINYINT, defaultValue: 0, comment: '排序' },
  description: { type: DataTypes.TEXT, comment: '描述' },
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '0停用 1启用' },
}, {
  tableName: 'fire_duty_shift',
  timestamps: true,
  underscored: true,
  comment: '班次定义表',
});
