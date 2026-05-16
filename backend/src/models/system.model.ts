import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

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
