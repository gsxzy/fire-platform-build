"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloorCameraBinding = exports.FloorDevicePosition = exports.Floor = exports.Building = void 0;
exports.initFloorPlanAssociations = initFloorPlanAssociations;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
class Building extends sequelize_1.Model {
    id;
    unit_id;
    name;
    type;
    total_floors;
    address;
    remark;
    created_at;
    updated_at;
}
exports.Building = Building;
Building.init({
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    unit_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, comment: '所属单位' },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, comment: '建筑物名称' },
    type: { type: sequelize_1.DataTypes.STRING(50), comment: '建筑类型：商业/住宅/工业/公共' },
    total_floors: { type: sequelize_1.DataTypes.INTEGER, comment: '总层数' },
    address: { type: sequelize_1.DataTypes.STRING(255) },
    remark: { type: sequelize_1.DataTypes.TEXT },
}, {
    sequelize: database_1.default,
    tableName: 'buildings',
    timestamps: true,
    underscored: true,
    comment: '建筑物信息',
});
class Floor extends sequelize_1.Model {
    id;
    building_id;
    name;
    floor_number;
    plan_image_url;
    plan_width;
    plan_height;
    created_at;
    updated_at;
}
exports.Floor = Floor;
Floor.init({
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    building_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: '所属建筑物' },
    name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, comment: '楼层名称：B1/F1/F2/屋顶' },
    floor_number: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: '楼层号，用于排序：-1/1/2' },
    plan_image_url: { type: sequelize_1.DataTypes.STRING(500), comment: '平面图图片URL' },
    plan_width: { type: sequelize_1.DataTypes.INTEGER, comment: '图片原始宽度px' },
    plan_height: { type: sequelize_1.DataTypes.INTEGER, comment: '图片原始高度px' },
}, {
    sequelize: database_1.default,
    tableName: 'floors',
    timestamps: true,
    underscored: true,
    comment: '楼层/分区信息',
});
class FloorDevicePosition extends sequelize_1.Model {
    id;
    floor_id;
    device_id;
    x;
    y;
    created_at;
    updated_at;
}
exports.FloorDevicePosition = FloorDevicePosition;
FloorDevicePosition.init({
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    floor_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: '所属楼层' },
    device_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, comment: '关联设备' },
    x: { type: sequelize_1.DataTypes.FLOAT, allowNull: false, comment: 'X坐标百分比' },
    y: { type: sequelize_1.DataTypes.FLOAT, allowNull: false, comment: 'Y坐标百分比' },
}, {
    sequelize: database_1.default,
    tableName: 'floor_device_positions',
    timestamps: true,
    underscored: true,
    comment: '设备平面图点位',
    indexes: [{ unique: true, fields: ['floor_id', 'device_id'] }],
});
class FloorCameraBinding extends sequelize_1.Model {
    id;
    floor_id;
    camera_device_id;
    bound_device_ids;
    x;
    y;
    created_at;
    updated_at;
}
exports.FloorCameraBinding = FloorCameraBinding;
FloorCameraBinding.init({
    id: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    floor_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    camera_device_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    bound_device_ids: { type: sequelize_1.DataTypes.TEXT, comment: 'JSON数组：绑定的消防设备ID' },
    x: { type: sequelize_1.DataTypes.FLOAT, comment: '摄像头在图上X坐标' },
    y: { type: sequelize_1.DataTypes.FLOAT, comment: '摄像头在图上Y坐标' },
}, {
    sequelize: database_1.default,
    tableName: 'floor_camera_bindings',
    timestamps: true,
    underscored: true,
});
// ═══════════════════════════════════════════════════════════════════
// 关联关系（需要在 index.ts 的 initModels 中调用）
// ═══════════════════════════════════════════════════════════════════
function initFloorPlanAssociations(models) {
    Building.belongsTo(models.Unit, { foreignKey: 'unit_id', as: 'unit' });
    Building.hasMany(Floor, { foreignKey: 'building_id', as: 'floors' });
    Floor.belongsTo(Building, { foreignKey: 'building_id', as: 'building' });
    Floor.hasMany(FloorDevicePosition, { foreignKey: 'floor_id', as: 'positions' });
    Floor.hasMany(FloorCameraBinding, { foreignKey: 'floor_id', as: 'cameraBindings' });
    FloorDevicePosition.belongsTo(Floor, { foreignKey: 'floor_id', as: 'floor' });
    FloorDevicePosition.belongsTo(models.Device, { foreignKey: 'device_id', as: 'device' });
    FloorCameraBinding.belongsTo(Floor, { foreignKey: 'floor_id', as: 'floor' });
}
//# sourceMappingURL=floorPlan.model.js.map