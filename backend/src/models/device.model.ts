import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 3. 设备管理 ── */
export const Device = sequelize.define('device', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  device_no: { type: DataTypes.STRING(50), allowNull: false, unique: true, comment: '设备编号，系统自动生成' },
  device_name: { type: DataTypes.STRING(100), allowNull: false, comment: '设备名称' },
  device_type: { type: DataTypes.STRING(30), allowNull: false, comment: '烟感/温感/手报/消火栓/水泵/风机/摄像头等' },
  device_model: DataTypes.STRING(50),
  manufacturer: DataTypes.STRING(100),
  unit_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, comment: '未分配档案可为空' },
  install_location: DataTypes.STRING(200),
  floor: DataTypes.STRING(10),
  room: DataTypes.STRING(50),
  lng: DataTypes.DECIMAL(10, 7),
  lat: DataTypes.DECIMAL(10, 7),
  install_date: DataTypes.DATEONLY,
  production_date: DataTypes.DATEONLY,
  warranty_period: DataTypes.INTEGER,
  warranty_expire: DataTypes.DATEONLY,
  maintenance_expire: DataTypes.DATEONLY,
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '运行状态：1正常 2故障 3离线 4报废 0停用' },
  lifecycle_status: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    comment: '流程状态：0草稿/预登记 1已入库 2已接入 3已分配 4维护中 5报废',
  },
  last_online: DataTypes.DATE,
  iot_id: DataTypes.STRING(100),
  protocol_type: DataTypes.STRING(20),
  device_sn: DataTypes.STRING(100),
  protocol_config: DataTypes.TEXT,
  project_code: DataTypes.STRING(64),
  building_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, comment: '所属建筑ID（分配阶段）' },
  floor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, comment: '所属楼层ID（分配阶段）' },
  point_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, comment: '平面图点位ID（分配阶段）' },
  /* 新增字段：商用交付补齐 */
  remark: DataTypes.TEXT,
  config: DataTypes.TEXT,
  online_status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '在线状态：0离线 1在线' },
  calibration_cycle: DataTypes.INTEGER,
  scrap_year: DataTypes.INTEGER,
  gateway_id: DataTypes.STRING(100),
}, {
  tableName: 'fire_device',
  comment: '消防设备表',
  indexes: [
    { name: 'idx_unit_id', fields: ['unit_id'] },
    { name: 'idx_device_type', fields: ['device_type'] },
    { name: 'idx_status', fields: ['status'] },
    { name: 'idx_building_id', fields: ['building_id'] },
    { name: 'idx_floor_id', fields: ['floor_id'] },
    { name: 'idx_device_no', fields: ['device_no'] },
    { name: 'idx_device_sn', fields: ['device_sn'] },
    { name: 'idx_lifecycle_status', fields: ['lifecycle_status'] },
    /* 复合索引：入库管理列表高频查询（按 lifecycle_status 筛选 + created_at 排序） */
    { name: 'idx_lifecycle_created', fields: ['lifecycle_status', 'created_at'] },
    /* 复合索引：设备编号/名称/SN 联合搜索 */
    { name: 'idx_device_search', fields: ['device_no', 'device_name', 'device_sn'] },
    /* 网关关联索引：查询传输装置关联的主机 */
    { name: 'idx_gateway_id', fields: ['gateway_id'] },
  ],
});

/* ── 3b. 设备维护（巡检/维保/维修台账，设备管理子模块） ── */
export const DeviceMaintenance = sequelize.define(
  'device_maintenance',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    device_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    device_code: DataTypes.STRING(50),
    device_name: DataTypes.STRING(100),
    unit_name: DataTypes.STRING(200),
    type: { type: DataTypes.STRING(20), allowNull: false, comment: 'inspection|maintenance|repair' },
    plan_date: DataTypes.DATEONLY,
    actual_date: DataTypes.DATEONLY,
    executor: DataTypes.STRING(50),
    cost: DataTypes.DECIMAL(10, 2),
    content: DataTypes.TEXT,
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  },
  { tableName: 'fire_device_maintenance', comment: '设备维护记录表' }
);
