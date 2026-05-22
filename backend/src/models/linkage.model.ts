import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 13. 安消联动 ── */
export const LinkageRule = sequelize.define('linkage_rule', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  rule_name: { type: DataTypes.STRING(100), allowNull: false },
  trigger_type: { type: DataTypes.SMALLINT, comment: '1告警触发 2手动触发 3定时触发' },
  trigger_device_id: DataTypes.BIGINT,
  trigger_condition: DataTypes.TEXT,
  action_devices: DataTypes.TEXT,
  action_commands: DataTypes.TEXT,
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
}, { tableName: 'fire_linkage_rule', comment: '联动规则表' });
