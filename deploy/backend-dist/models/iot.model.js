"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataPipeline = exports.ProtocolConfig = exports.IoTDevice = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 11. IoT设备接入 ── */
exports.IoTDevice = database_1.default.define('iot_device', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    archive_device_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true, comment: '关联 fire_device.id，一台档案设备唯一一条接入记录' },
    device_sn: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, unique: true, comment: '设备SN，从档案同步' },
    device_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, comment: '设备名称，从档案同步' },
    device_type: sequelize_1.DataTypes.STRING(30),
    protocol_type: { type: sequelize_1.DataTypes.STRING(20), comment: '通信协议：MQTT/ModbusTCP/HTTP/GB26875/GB28181/FSCN8001' },
    protocol_config: sequelize_1.DataTypes.TEXT,
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '在线状态：0离线 1在线 2故障' },
    last_online: sequelize_1.DataTypes.DATE,
    ip_address: sequelize_1.DataTypes.STRING(50),
    port: sequelize_1.DataTypes.INTEGER,
    data_format: sequelize_1.DataTypes.STRING(20),
}, {
    tableName: 'fire_iot_device',
    comment: 'IoT接入设备表：仅存储协议/网络/连通性配置，数据唯一源头在 fire_device',
    indexes: [
        { name: 'idx_unit_id', fields: ['unit_id'] },
        { name: 'idx_protocol_type', fields: ['protocol_type'] },
    ],
});
exports.ProtocolConfig = database_1.default.define('protocol_config', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    protocol_name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    protocol_type: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    config_json: sequelize_1.DataTypes.TEXT,
    description: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_protocol_config', comment: '协议配置表' });
exports.DataPipeline = database_1.default.define('data_pipeline', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    pipeline_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    source_type: sequelize_1.DataTypes.STRING(20),
    source_config: sequelize_1.DataTypes.TEXT,
    transform_rules: sequelize_1.DataTypes.TEXT,
    dest_type: sequelize_1.DataTypes.STRING(20),
    dest_config: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_data_pipeline', comment: '数据流转管道表' });
//# sourceMappingURL=iot.model.js.map