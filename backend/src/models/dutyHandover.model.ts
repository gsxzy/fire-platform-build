import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 交接班记录表 ── */
export const DutyHandover = sequelize.define('DutyHandover', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  handover_no: { type: DataTypes.STRING(50), comment: '交接班编号' },
  schedule_id: { type: DataTypes.BIGINT.UNSIGNED, comment: '排班ID' },
  shift_id: { type: DataTypes.BIGINT.UNSIGNED, comment: '班次ID' },
  shift_name: { type: DataTypes.STRING(50), comment: '班次名称' },
  from_user_id: { type: DataTypes.BIGINT.UNSIGNED, comment: '交班人ID' },
  from_user_name: { type: DataTypes.STRING(50), comment: '交班人姓名' },
  to_user_id: { type: DataTypes.BIGINT.UNSIGNED, comment: '接班人ID' },
  to_user_name: { type: DataTypes.STRING(50), comment: '接班人姓名' },
  handover_time: { type: DataTypes.DATE, comment: '交接时间' },
  accept_time: { type: DataTypes.DATE, comment: '确认时间' },
  pending_alarm_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '未处置告警数' },
  pending_workorder_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '待办工单数' },
  abnormal_device_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '异常设备数' },
  handover_items: { type: DataTypes.TEXT, comment: '交接事项JSON' },
  focus_items: { type: DataTypes.TEXT, comment: '重点关注事项' },
  equipment_status: { type: DataTypes.TEXT, comment: '设备状态摘要' },
  from_signature: { type: DataTypes.STRING(255), comment: '交班人电子签名' },
  to_signature: { type: DataTypes.STRING(255), comment: '接班人电子签名' },
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0待确认 1已确认' },
}, {
  tableName: 'fire_duty_handover',
  timestamps: true,
  underscored: true,
  comment: '交接班记录表',
  indexes: [
    { name: 'idx_schedule_id', fields: ['schedule_id'] },
    { name: 'idx_from_user', fields: ['from_user_id'] },
    { name: 'idx_to_user', fields: ['to_user_id'] },
    { name: 'idx_handover_time', fields: ['handover_time'] },
    { name: 'idx_status', fields: ['status'] },
  ],
});
