import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 9. 应急预案 ── */
export const EmergencyPlan = sequelize.define('emergency_plan', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  plan_name: { type: DataTypes.STRING(200), allowNull: false },
  plan_type: { type: DataTypes.TINYINT, comment: '1灭火 2疏散 3防汛 4停电' },
  plan_level: { type: DataTypes.TINYINT, comment: '1一级 2二级 3三级' },
  version_no: DataTypes.STRING(30),
  unit_id: DataTypes.BIGINT.UNSIGNED,
  applicable_scene: DataTypes.TEXT,
  content: DataTypes.TEXT('long'),
  file_url: DataTypes.STRING(500),
  update_date: DataTypes.DATEONLY,
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1生效中 0已废止 2修订中' },
}, { tableName: 'fire_emergency_plan', comment: '应急预案表' });

export const EmergencyDrill = sequelize.define('emergency_drill', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  drill_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  drill_name: DataTypes.STRING(200),
  plan_id: DataTypes.BIGINT.UNSIGNED,
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  drill_date: DataTypes.DATE,
  location: DataTypes.STRING(200),
  duration: DataTypes.STRING(50),
  drill_type: DataTypes.STRING(30),
  participants: DataTypes.INTEGER,
  drill_content: DataTypes.TEXT,
  result: DataTypes.TEXT,
  photos: DataTypes.TEXT,
  video_url: DataTypes.STRING(500),
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1计划中 2进行中 3已完成 0已取消' },
}, { tableName: 'fire_emergency_drill', comment: '演练记录表' });

export const DrillParticipant = sequelize.define('drill_participant', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  drill_id: DataTypes.BIGINT.UNSIGNED,
  name: { type: DataTypes.STRING(64), allowNull: false },
  role: DataTypes.STRING(64),
}, {
  tableName: 'drill_participants',
  comment: '演练参与人表',
  timestamps: true,
  underscored: true,
});
