import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 9. 应急预案 ── */
export const EmergencyPlan = sequelize.define('emergency_plan', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  plan_name: { type: DataTypes.STRING(200), allowNull: false },
  plan_type: { type: DataTypes.TINYINT, comment: '1灭火 2疏散 3防汛 4停电' },
  unit_id: DataTypes.BIGINT.UNSIGNED,
  applicable_scene: DataTypes.TEXT,
  content: DataTypes.TEXT('long'),
  file_url: DataTypes.STRING(500),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_emergency_plan', comment: '应急预案表' });

export const EmergencyDrill = sequelize.define('emergency_drill', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  drill_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  plan_id: DataTypes.BIGINT.UNSIGNED,
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  drill_date: DataTypes.DATE,
  drill_type: DataTypes.STRING(30),
  participants: DataTypes.INTEGER,
  drill_content: DataTypes.TEXT,
  result: DataTypes.TEXT,
  photos: DataTypes.TEXT,
  video_url: DataTypes.STRING(500),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_emergency_drill', comment: '演练记录表' });
