import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 12. 设备反控 ── */
export const ControlCommand = sequelize.define('control_command', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  cmd_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  device_id: DataTypes.BIGINT,
  device_name: DataTypes.STRING(100),
  cmd_type: { type: DataTypes.SMALLINT, comment: '1远程启停 2参数配置 3复位' },
  cmd_param: DataTypes.TEXT,
  status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0待执行 1执行中 2成功 3失败' },
  execute_time: DataTypes.DATE,
  result: DataTypes.TEXT,
  operator_id: DataTypes.BIGINT,
  operator_name: DataTypes.STRING(50),
}, { tableName: 'fire_control_command', comment: '设备控制指令表' });
