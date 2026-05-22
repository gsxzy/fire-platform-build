import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 7. 值守中心 ── */
export const DutySchedule = sequelize.define('duty_schedule', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user_id: DataTypes.BIGINT,
  user_name: DataTypes.STRING(50),
  duty_date: DataTypes.DATEONLY,
  shift_type: { type: DataTypes.SMALLINT, comment: '1早班 2中班 3晚班' },
  start_time: DataTypes.TIME,
  end_time: DataTypes.TIME,
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
}, {
  tableName: 'fire_duty_schedule',
  comment: '值班排班表',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['duty_date'] },
  ],
});

export const DutyLog = sequelize.define('duty_log', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user_id: DataTypes.BIGINT,
  user_name: DataTypes.STRING(50),
  on_duty_time: DataTypes.DATE,
  off_duty_time: DataTypes.DATE,
  handover_content: DataTypes.TEXT,
  incidents: DataTypes.TEXT,
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
}, { tableName: 'fire_duty_log', comment: '值班日志表' });
