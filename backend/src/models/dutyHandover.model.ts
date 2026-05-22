import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 交接班记录表 ── */
export const DutyHandover = sequelize.define('DutyHandover', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  handover_no: { type: DataTypes.STRING(50), comment: '交接班编号' },
  schedule_id: { type: DataTypes.BIGINT, comment: '排班ID' },
  shift_id: { type: DataTypes.BIGINT, comment: '班次ID' },
  shift_name: { type: DataTypes.STRING(50), comment: '班次名称' },
  from_user_id: { type: DataTypes.BIGINT, comment: '交班人ID' },
  from_user_name: { type: DataTypes.STRING(50), comment: '交班人姓名' },
  to_user_id: { type: DataTypes.BIGINT, comment: '接班人ID' },
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
  status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0待确认 1已确认' },
}, {
  tableName: 'fire_duty_handover',
  timestamps: true,
  underscored: true,
  comment: '交接班记录表',
  indexes: [
    { fields: ['schedule_id'] },
    { fields: ['from_user_id'] },
    { fields: ['to_user_id'] },
    { fields: ['handover_time'] },
    { fields: ['status'] },
  ],
});
