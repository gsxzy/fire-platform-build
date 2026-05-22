import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

export const ReportSchedule = sequelize.define('report_schedule', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  report_name: { type: DataTypes.STRING(128), allowNull: false },
  report_type: { type: DataTypes.STRING(32), allowNull: false, comment: 'daily|weekly|monthly|device|maintenance|patrol' },
  unit_id: DataTypes.BIGINT,
  cron_expr: { type: DataTypes.STRING(50), defaultValue: '0 8 * * *', comment: 'Cron 表达式' },
  recipients: DataTypes.TEXT,
  format: { type: DataTypes.STRING(10), defaultValue: 'xlsx', comment: 'csv|xlsx' },
  last_run_at: DataTypes.DATE,
  last_run_status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0未执行 1成功 2失败' },
  status: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '1启用 0停用' },
}, {
  tableName: 'report_schedule',
  comment: '定时报表任务表',
  timestamps: true,
  underscored: true,
});
