import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 17. 人员管理 ── */
export const Personnel = sequelize.define('personnel', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  phone: { type: DataTypes.STRING(20), defaultValue: '' },
  role: { type: DataTypes.STRING(32), defaultValue: 'operator', comment: 'manager|duty_officer|safety_officer|operator|inspector' },
  unit_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
  unit_name: { type: DataTypes.STRING(100), defaultValue: '' },
  cert_type: { type: DataTypes.STRING(50), defaultValue: '' },
  cert_no: { type: DataTypes.STRING(50), defaultValue: '' },
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
}, {
  tableName: 'sys_personnel',
  comment: '系统人员表',
  indexes: [
    { name: 'idx_role', fields: ['role'] },
    { name: 'idx_unit_id', fields: ['unit_id'] },
    { name: 'idx_status', fields: ['status'] },
  ],
});

/* ── 18. 系统配置 ── */
export const SystemConfig = sequelize.define('system_config', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  config_key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  config_value: DataTypes.TEXT,
  description: DataTypes.STRING(200),
}, { tableName: 'sys_config', comment: '系统配置表' });


/* ── 19. 通知模板 ── */
export const NotifyTemplate = sequelize.define('notify_template', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  template_name: { type: DataTypes.STRING(100), allowNull: false },
  template_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  channel: { type: DataTypes.STRING(20), comment: 'sms/email/app/wechat' },
  subject: DataTypes.STRING(200),
  content: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'sys_notify_template', comment: '通知模板表' });


/* ── 20. 大屏配置 ── */
export const ScreenConfig = sequelize.define('screen_config', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  screen_name: { type: DataTypes.STRING(100), allowNull: false },
  layout_config: DataTypes.TEXT('long'),
  widget_config: DataTypes.TEXT('long'),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_screen_config', comment: '大屏配置表' });

/* ── 20.1 大屏组件 ── */
export const ScreenWidget = sequelize.define('screen_widget', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  screen_id: DataTypes.BIGINT.UNSIGNED,
  widget_type: { type: DataTypes.STRING(32), comment: 'alarm_stat|device_map|subsystem|trend|rank|pie|recent' },
  widget_name: DataTypes.STRING(100),
  config: DataTypes.TEXT('long'),
  position_x: { type: DataTypes.INTEGER, defaultValue: 0 },
  position_y: { type: DataTypes.INTEGER, defaultValue: 0 },
  width: { type: DataTypes.INTEGER, defaultValue: 4 },
  height: { type: DataTypes.INTEGER, defaultValue: 2 },
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, {
  tableName: 'fire_screen_widget',
  comment: '大屏组件表',
  indexes: [{ name: 'idx_screen_id', fields: ['screen_id'] }],
});
