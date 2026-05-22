import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 8. 消控室 ── */
export const ControlRoom = sequelize.define('control_room', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  room_name: { type: DataTypes.STRING(100), allowNull: false },
  unit_id: DataTypes.BIGINT,
  unit_name: DataTypes.STRING(200),
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
  duty_person: DataTypes.STRING(50),
  duty_phone: DataTypes.STRING(20),
  video_url: DataTypes.STRING(500),
}, {
  tableName: 'fire_control_room',
  comment: '消控室表',
  indexes: [
    { fields: ['unit_id'] },
    { fields: ['status'] },
  ],
});


/* ── 消控室报警主机 ── */
export const ControlRoomHost = sequelize.define('control_room_host', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  room_id: { type: DataTypes.BIGINT, allowNull: false, comment: '所属消控室ID' },
  host_name: { type: DataTypes.STRING(100), allowNull: false, comment: '主机名称' },
  host_model: { type: DataTypes.STRING(50), comment: '主机型号' },
  host_no: { type: DataTypes.STRING(50), comment: '主机编号' },
  host_ip: { type: DataTypes.STRING(50), comment: '主机IP地址' },
  host_port: { type: DataTypes.INTEGER, defaultValue: 502, comment: '主机通讯端口' },
  protocol_type: { type: DataTypes.STRING(20), defaultValue: 'ModbusTCP', comment: '通讯协议 ModbusTCP/GB26875/私有协议' },
  slave_id: { type: DataTypes.INTEGER, defaultValue: 1, comment: '从机地址' },
  loop_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '回路数量' },
  device_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '挂载设备数' },
  manual_mode: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0自动 1手动' },
  silenced: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0正常 1消音' },
  status: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '0离线 1在线 2故障' },
  last_heartbeat: DataTypes.DATE,
}, {
  tableName: 'fire_control_room_host',
  comment: '消控室报警主机表',
  indexes: [
    { fields: ['room_id'] },
    { fields: ['status'] },
    { fields: ['protocol_type'] },
  ],
});


/* ── 消控室主机多线盘 ── */
export const MultilinePanel = sequelize.define('multiline_panel', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  host_id: { type: DataTypes.BIGINT, allowNull: false },
  panel_name: { type: DataTypes.STRING(50), defaultValue: '多线盘' },
  point_no: { type: DataTypes.INTEGER, allowNull: false, comment: '点位号' },
  point_name: { type: DataTypes.STRING(100), comment: '点位名称' },
  device_type: { type: DataTypes.STRING(30), comment: '设备类型' },
  status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0停止 1启动 2故障' },
  feedback_status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0无反馈 1有反馈' },
}, {
  tableName: 'fire_multiline_panel',
  comment: '多线盘点位表',
  indexes: [
    { fields: ['host_id'] },
    { fields: ['status'] },
  ],
});


/* ── 消控室主机总线点位 ── */
export const BusPoint = sequelize.define('bus_point', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  host_id: { type: DataTypes.BIGINT, allowNull: false },
  loop_no: { type: DataTypes.INTEGER, allowNull: false, comment: '回路号' },
  point_no: { type: DataTypes.INTEGER, allowNull: false, comment: '点位号' },
  point_name: { type: DataTypes.STRING(100), comment: '点位名称' },
  device_type: { type: DataTypes.STRING(30), comment: '设备类型' },
  install_location: DataTypes.STRING(200),
  status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0正常 1火警 2故障 3屏蔽 4预警' },
}, {
  tableName: 'fire_bus_point',
  comment: '总线点位表',
  indexes: [
    { fields: ['host_id'] },
    { fields: ['loop_no'] },
    { fields: ['status'] },
    /* 复合索引：按回路号+点位号查询 */
    { fields: ['host_id', 'loop_no', 'point_no'] },
  ],
});


/* ── 消控室控制指令日志 ── */
export const HostCommandLog = sequelize.define('host_command_log', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  room_id: DataTypes.BIGINT,
  host_id: DataTypes.BIGINT,
  host_name: DataTypes.STRING(100),
  cmd_type: { type: DataTypes.SMALLINT, allowNull: false, comment: '1消音 2复位 3手自动切换 4多线启动 5多线停止 6总线控制' },
  cmd_param: DataTypes.TEXT,
  result: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0待执行 1成功 2失败' },
  result_msg: DataTypes.STRING(255),
  operator_id: DataTypes.BIGINT,
  operator_name: DataTypes.STRING(50),
}, {
  tableName: 'fire_host_command_log',
  comment: '主机控制指令日志表',
  indexes: [
    { fields: ['room_id'] },
    { fields: ['host_id'] },
    { fields: ['cmd_type'] },
    { fields: ['result'] },
    { fields: ['created_at'] },
  ],
});


/* ── 报警主机编码表 ── */
export const HostDeviceCode = sequelize.define('host_device_code', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  host_id: { type: DataTypes.BIGINT, allowNull: false, comment: '所属报警主机ID' },
  loop_no: { type: DataTypes.INTEGER, allowNull: false, comment: '回路号' },
  point_no: { type: DataTypes.INTEGER, allowNull: false, comment: '点位号' },
  device_type: { type: DataTypes.STRING(30), comment: '设备类型' },
  device_name: { type: DataTypes.STRING(100), comment: '设备名称' },
  install_location: { type: DataTypes.STRING(200), comment: '安装位置' },
  floor: { type: DataTypes.STRING(10), comment: '楼层' },
  parent_device: { type: DataTypes.STRING(100), comment: '父设备' },
  status: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '1正常 2故障 3停用' },
}, {
  tableName: 'fire_host_device_code',
  comment: '报警主机编码表',
  indexes: [
    { fields: ['host_id'] },
    { fields: ['status'] },
    { unique: true, name: 'uk_host_loop_point', fields: ['host_id', 'loop_no', 'point_no'] },
  ],
});
