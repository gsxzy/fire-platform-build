import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 12. 设备反控 ── */
export const ControlCommand = sequelize.define('control_command', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  cmd_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  device_id: DataTypes.BIGINT.UNSIGNED,
  device_name: DataTypes.STRING(100),
  cmd_type: { type: DataTypes.TINYINT, comment: '1远程启停 2参数配置 3复位' },
  cmd_param: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0待执行 1执行中 2成功 3失败' },
  execute_time: DataTypes.DATE,
  result: DataTypes.TEXT,
  operator_id: DataTypes.BIGINT.UNSIGNED,
  operator_name: DataTypes.STRING(50),
}, { tableName: 'fire_control_command', comment: '设备控制指令表' });
