import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 告警阈值规则（IoT 传感器数据阈值） ── */
export const AlarmThreshold = sequelize.define('AlarmThreshold', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: '规则名称' },
  device_type: { type: DataTypes.STRING(50), comment: '设备类型（为空则匹配全部）' },
  metric_type: { type: DataTypes.STRING(32), allowNull: false, comment: '指标类型：temperature/pressure/level/smoke/voltage/current' },
  operator: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '>', comment: '比较运算符：> >= < <= ==' },
  threshold_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: '阈值' },
  duration_seconds: { type: DataTypes.INTEGER, defaultValue: 0, comment: '持续多少秒才触发（0表示立即）' },
  alarm_type: { type: DataTypes.TINYINT, defaultValue: 3, comment: '触发告警类型：1火警 2故障 3预警' },
  alarm_level: { type: DataTypes.TINYINT, defaultValue: 2, comment: '触发告警级别：1一般 2严重 3紧急' },
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
}, {
  tableName: 'alarm_threshold',
  timestamps: true,
  underscored: true,
  comment: '告警阈值规则表',
  indexes: [
    { name: 'idx_metric_status', fields: ['metric_type', 'status'] },
    { name: 'idx_device_type', fields: ['device_type'] },
  ],
});

/* ── 告警通知策略 ── */
export const AlarmNotifyPolicy = sequelize.define('AlarmNotifyPolicy', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: '策略名称' },
  alarm_types: { type: DataTypes.JSON, comment: '适用告警类型 [1,2,3]' },
  alarm_levels: { type: DataTypes.JSON, comment: '适用告警级别 [1,2,3]' },
  channels: { type: DataTypes.JSON, comment: '通知渠道 {sms:true, email:true, app:true, voice:false}' },
  targets: { type: DataTypes.JSON, comment: '通知对象 [{type:"role",value:"duty"},{type:"user",value:"123"}]' },
  escalation_enabled: { type: DataTypes.TINYINT, defaultValue: 0, comment: '是否启用升级 0否 1是' },
  escalation_minutes: { type: DataTypes.INTEGER, defaultValue: 5, comment: '升级触发时间（分钟）' },
  escalation_targets: { type: DataTypes.JSON, comment: '升级通知对象' },
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
}, {
  tableName: 'alarm_notify_policy',
  timestamps: true,
  underscored: true,
  comment: '告警通知策略表',
  indexes: [
    { name: 'idx_status', fields: ['status'] },
  ],
});
