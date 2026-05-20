"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostDeviceCode = exports.HostCommandLog = exports.BusPoint = exports.MultilinePanel = exports.ControlRoomHost = exports.ControlRoom = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 8. 消控室 ── */
exports.ControlRoom = database_1.default.define('control_room', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    room_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_name: sequelize_1.DataTypes.STRING(200),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
    duty_person: sequelize_1.DataTypes.STRING(50),
    duty_phone: sequelize_1.DataTypes.STRING(20),
    video_url: sequelize_1.DataTypes.STRING(500),
}, {
    tableName: 'fire_control_room',
    comment: '消控室表',
    indexes: [
        { name: 'idx_unit_id', fields: ['unit_id'] },
        { name: 'idx_status', fields: ['status'] },
    ],
});
/* ── 消控室报警主机 ── */
exports.ControlRoomHost = database_1.default.define('control_room_host', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    room_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, comment: '所属消控室ID' },
    host_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, comment: '主机名称' },
    host_model: { type: sequelize_1.DataTypes.STRING(50), comment: '主机型号' },
    host_no: { type: sequelize_1.DataTypes.STRING(50), comment: '主机编号' },
    host_ip: { type: sequelize_1.DataTypes.STRING(50), comment: '主机IP地址' },
    host_port: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 502, comment: '主机通讯端口' },
    protocol_type: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'ModbusTCP', comment: '通讯协议 ModbusTCP/GB26875/私有协议' },
    slave_id: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 1, comment: '从机地址' },
    loop_count: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, comment: '回路数量' },
    device_count: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, comment: '挂载设备数' },
    manual_mode: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0自动 1手动' },
    silenced: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0正常 1消音' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '0离线 1在线 2故障' },
    last_heartbeat: sequelize_1.DataTypes.DATE,
}, {
    tableName: 'fire_control_room_host',
    comment: '消控室报警主机表',
    indexes: [
        { name: 'idx_room_id', fields: ['room_id'] },
        { name: 'idx_status', fields: ['status'] },
        { name: 'idx_protocol_type', fields: ['protocol_type'] },
    ],
});
/* ── 消控室主机多线盘 ── */
exports.MultilinePanel = database_1.default.define('multiline_panel', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    host_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false },
    panel_name: { type: sequelize_1.DataTypes.STRING(50), defaultValue: '多线盘' },
    point_no: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: '点位号' },
    point_name: { type: sequelize_1.DataTypes.STRING(100), comment: '点位名称' },
    device_type: { type: sequelize_1.DataTypes.STRING(30), comment: '设备类型' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0停止 1启动 2故障' },
    feedback_status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0无反馈 1有反馈' },
}, {
    tableName: 'fire_multiline_panel',
    comment: '多线盘点位表',
    indexes: [
        { name: 'idx_host_id', fields: ['host_id'] },
        { name: 'idx_status', fields: ['status'] },
    ],
});
/* ── 消控室主机总线点位 ── */
exports.BusPoint = database_1.default.define('bus_point', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    host_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false },
    loop_no: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: '回路号' },
    point_no: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: '点位号' },
    point_name: { type: sequelize_1.DataTypes.STRING(100), comment: '点位名称' },
    device_type: { type: sequelize_1.DataTypes.STRING(30), comment: '设备类型' },
    install_location: sequelize_1.DataTypes.STRING(200),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0正常 1火警 2故障 3屏蔽 4预警' },
}, {
    tableName: 'fire_bus_point',
    comment: '总线点位表',
    indexes: [
        { name: 'idx_host_id', fields: ['host_id'] },
        { name: 'idx_loop_no', fields: ['loop_no'] },
        { name: 'idx_status', fields: ['status'] },
        /* 复合索引：按回路号+点位号查询 */
        { name: 'idx_host_loop_point', fields: ['host_id', 'loop_no', 'point_no'] },
    ],
});
/* ── 消控室控制指令日志 ── */
exports.HostCommandLog = database_1.default.define('host_command_log', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    room_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    host_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    host_name: sequelize_1.DataTypes.STRING(100),
    cmd_type: { type: sequelize_1.DataTypes.TINYINT, allowNull: false, comment: '1消音 2复位 3手自动切换 4多线启动 5多线停止 6总线控制' },
    cmd_param: sequelize_1.DataTypes.TEXT,
    result: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0待执行 1成功 2失败' },
    result_msg: sequelize_1.DataTypes.STRING(255),
    operator_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    operator_name: sequelize_1.DataTypes.STRING(50),
}, {
    tableName: 'fire_host_command_log',
    comment: '主机控制指令日志表',
    indexes: [
        { name: 'idx_room_id', fields: ['room_id'] },
        { name: 'idx_host_id', fields: ['host_id'] },
        { name: 'idx_cmd_type', fields: ['cmd_type'] },
        { name: 'idx_result', fields: ['result'] },
        { name: 'idx_created_at', fields: ['created_at'] },
    ],
});
/* ── 报警主机编码表 ── */
exports.HostDeviceCode = database_1.default.define('host_device_code', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    host_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, comment: '所属报警主机ID' },
    loop_no: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: '回路号' },
    point_no: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: '点位号' },
    device_type: { type: sequelize_1.DataTypes.STRING(30), comment: '设备类型' },
    device_name: { type: sequelize_1.DataTypes.STRING(100), comment: '设备名称' },
    install_location: { type: sequelize_1.DataTypes.STRING(200), comment: '安装位置' },
    floor: { type: sequelize_1.DataTypes.STRING(10), comment: '楼层' },
    parent_device: { type: sequelize_1.DataTypes.STRING(100), comment: '父设备' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1正常 2故障 3停用' },
}, {
    tableName: 'fire_host_device_code',
    comment: '报警主机编码表',
    indexes: [
        { name: 'idx_host_id', fields: ['host_id'] },
        { name: 'idx_status', fields: ['status'] },
        { unique: true, name: 'uk_host_loop_point', fields: ['host_id', 'loop_no', 'point_no'] },
    ],
});
//# sourceMappingURL=controlRoom.model.js.map