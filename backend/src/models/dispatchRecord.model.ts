import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 接警处置记录（与告警一一对应或一对多） ── */
export const DispatchRecord = sequelize.define('DispatchRecord', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  alarm_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, comment: '关联告警ID' },
  alarm_no: { type: DataTypes.STRING(50), comment: '告警编号' },
  phase: { type: DataTypes.STRING(20), defaultValue: 'receive', comment: '阶段：receive接警 verify核实 handling处置 archive归档' },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending', comment: '状态：pending待处理 handling处理中 resolved已解决 confirmed_false确认误报' },
  handler_id: DataTypes.BIGINT.UNSIGNED,
  handler_name: DataTypes.STRING(50),
  dispatch_time: DataTypes.DATE,
  verify_time: DataTypes.DATE,
  resolve_time: DataTypes.DATE,
  dispatch_note: DataTypes.TEXT,
  verify_note: DataTypes.TEXT,
  resolve_note: DataTypes.TEXT,
  response_seconds: DataTypes.INTEGER,
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  device_id: DataTypes.BIGINT.UNSIGNED,
  device_name: DataTypes.STRING(100),
  location: DataTypes.STRING(200),
}, {
  tableName: 'dispatch_record',
  timestamps: true,
  underscored: true,
  comment: '接警处置记录表',
  indexes: [
    { name: 'idx_alarm_id', fields: ['alarm_id'] },
    { name: 'idx_status', fields: ['status'] },
    { name: 'idx_phase', fields: ['phase'] },
    { name: 'idx_handler', fields: ['handler_id'] },
    { name: 'idx_created_at', fields: ['created_at'] },
  ],
});
