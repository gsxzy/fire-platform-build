"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceMaintenance = exports.Device = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 3. 设备管理 ── */
exports.Device = database_1.default.define('device', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    device_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true, comment: '设备编号，系统自动生成' },
    device_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, comment: '设备名称' },
    device_type: { type: sequelize_1.DataTypes.STRING(30), allowNull: false, comment: '烟感/温感/手报/消火栓/水泵/风机/摄像头等' },
    device_model: sequelize_1.DataTypes.STRING(50),
    manufacturer: sequelize_1.DataTypes.STRING(100),
    unit_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: true, comment: '未分配档案可为空' },
    install_location: sequelize_1.DataTypes.STRING(200),
    floor: sequelize_1.DataTypes.STRING(10),
    room: sequelize_1.DataTypes.STRING(50),
    lng: sequelize_1.DataTypes.DECIMAL(10, 7),
    lat: sequelize_1.DataTypes.DECIMAL(10, 7),
    install_date: sequelize_1.DataTypes.DATEONLY,
    production_date: sequelize_1.DataTypes.DATEONLY,
    warranty_period: sequelize_1.DataTypes.INTEGER,
    warranty_expire: sequelize_1.DataTypes.DATEONLY,
    maintenance_expire: sequelize_1.DataTypes.DATEONLY,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '运行状态：1正常 2故障 3离线 4报废 0停用' },
    lifecycle_status: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 1,
        comment: '流程状态：0草稿/预登记 1已入库 2已接入 3已分配 4维护中 5报废',
    },
    last_online: sequelize_1.DataTypes.DATE,
    iot_id: sequelize_1.DataTypes.STRING(100),
    protocol_type: sequelize_1.DataTypes.STRING(20),
    device_sn: sequelize_1.DataTypes.STRING(100),
    protocol_config: sequelize_1.DataTypes.TEXT,
    project_code: sequelize_1.DataTypes.STRING(64),
    building_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true, comment: '所属建筑ID（分配阶段）' },
    floor_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true, comment: '所属楼层ID（分配阶段）' },
    point_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true, comment: '平面图点位ID（分配阶段）' },
    /* 新增字段：商用交付补齐 */
    remark: sequelize_1.DataTypes.TEXT,
    config: sequelize_1.DataTypes.TEXT,
    online_status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '在线状态：0离线 1在线' },
    calibration_cycle: sequelize_1.DataTypes.INTEGER,
    scrap_year: sequelize_1.DataTypes.INTEGER,
    gateway_id: sequelize_1.DataTypes.STRING(100),
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
    ],
});
/* ── 3b. 设备维护（巡检/维保/维修台账，设备管理子模块） ── */
exports.DeviceMaintenance = database_1.default.define('device_maintenance', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    device_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false },
    device_code: sequelize_1.DataTypes.STRING(50),
    device_name: sequelize_1.DataTypes.STRING(100),
    unit_name: sequelize_1.DataTypes.STRING(200),
    type: { type: sequelize_1.DataTypes.STRING(20), allowNull: false, comment: 'inspection|maintenance|repair' },
    plan_date: sequelize_1.DataTypes.DATEONLY,
    actual_date: sequelize_1.DataTypes.DATEONLY,
    executor: sequelize_1.DataTypes.STRING(50),
    cost: sequelize_1.DataTypes.DECIMAL(10, 2),
    content: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'pending' },
}, { tableName: 'fire_device_maintenance', comment: '设备维护记录表' });
//# sourceMappingURL=device.model.js.map