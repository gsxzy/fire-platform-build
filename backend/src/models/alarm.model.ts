import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 4. 告警中心 ── */
export const Alarm = sequelize.define('alarm', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  alarm_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  alarm_type: { type: DataTypes.SMALLINT, allowNull: false, comment: '1火警 2故障 3预警 4屏蔽 5其他' },
  alarm_level: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '1一般 2严重 3紧急' },
  device_id: DataTypes.BIGINT,
  device_name: DataTypes.STRING(100),
  unit_id: DataTypes.BIGINT,
  unit_name: DataTypes.STRING(200),
  location: DataTypes.STRING(200),
  alarm_desc: DataTypes.TEXT,
  status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0未处理 1确认中 2已处理 3误报' },
  handler_id: DataTypes.BIGINT,
  handler_name: DataTypes.STRING(50),
  handle_time: DataTypes.DATE,
  handle_result: DataTypes.TEXT,
  confirm_time: DataTypes.DATE,
  push_status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0未推送 1已推送 2推送失败' },
  // ── 协议层原始数据字段 ──
  protocol: DataTypes.STRING(20),
  loop_no: DataTypes.INTEGER,
  address: DataTypes.INTEGER,
  host_code: DataTypes.STRING(32),
  raw_data: DataTypes.TEXT,
}, {
  tableName: 'fire_alarm',
  comment: '告警记录表',
  indexes: [
    { fields: ['device_id'] },
    { fields: ['unit_id'] },
    { fields: ['status'] },
    { fields: ['alarm_type'] },
    { fields: ['alarm_level'] },
    { fields: ['created_at'] },
    /* 复合索引：告警中心列表高频筛选（类型+状态+时间倒序） */
    { fields: ['alarm_type', 'status', 'created_at'] },
    /* 复合索引：按设备查询告警历史 */
    { fields: ['device_id', 'created_at'] },
    /* 复合索引：单位告警统计 */
    { fields: ['unit_id', 'created_at'] },
  ],
});
