import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 11. IoT设备接入 ── */
export const IoTDevice = sequelize.define('iot_device', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  archive_device_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true, comment: '关联 fire_device.id，一台档案设备唯一一条接入记录' },
  device_sn: { type: DataTypes.STRING(100), allowNull: false, unique: true, comment: '设备SN，从档案同步' },
  device_name: { type: DataTypes.STRING(100), allowNull: false, comment: '设备名称，从档案同步' },
  device_type: DataTypes.STRING(30),
  protocol_type: { type: DataTypes.STRING(20), comment: '通信协议：MQTT/ModbusTCP/HTTP/GB26875/GB28181/FSCN8001' },
  protocol_config: DataTypes.TEXT,
  ctwing_device_id: { type: DataTypes.STRING(100), comment: 'CTWing 平台设备ID（冗余字段，避免 JSON_SEARCH 全表扫描）' },
  unit_id: DataTypes.BIGINT.UNSIGNED,
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '在线状态：0离线 1在线 2故障' },
  last_online: DataTypes.DATE,
  ip_address: DataTypes.STRING(50),
  port: DataTypes.INTEGER,
  data_format: DataTypes.STRING(20),
}, {
  tableName: 'fire_iot_device',
  comment: 'IoT接入设备表：仅存储协议/网络/连通性配置，数据唯一源头在 fire_device',
  indexes: [
    { name: 'idx_unit_id', fields: ['unit_id'] },
    { name: 'idx_protocol_type', fields: ['protocol_type'] },
    { name: 'idx_archive_device_id', fields: ['archive_device_id'] },
    { name: 'idx_device_sn', fields: ['device_sn'] },
    { name: 'idx_ctwing_device_id', fields: ['ctwing_device_id'] },
    /* 复合索引：在线状态检测（status + last_online） */
    { name: 'idx_status_online', fields: ['status', 'last_online'] },
  ],
});

export const ProtocolConfig = sequelize.define('protocol_config', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  protocol_name: { type: DataTypes.STRING(50), allowNull: false },
  protocol_type: { type: DataTypes.STRING(20), allowNull: false },
  config_json: DataTypes.TEXT,
  description: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_protocol_config', comment: '协议配置表' });

export const DataPipeline = sequelize.define('data_pipeline', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  pipeline_name: { type: DataTypes.STRING(100), allowNull: false },
  source_type: DataTypes.STRING(20),
  source_config: DataTypes.TEXT,
  transform_rules: DataTypes.TEXT,
  dest_type: DataTypes.STRING(20),
  dest_config: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_data_pipeline', comment: '数据流转管道表' });
