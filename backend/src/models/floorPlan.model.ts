import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

// ═══════════════════════════════════════════════════════════════════
// 建筑平面图数据模型
// 建筑物 → 楼层 → 设备点位
// ═══════════════════════════════════════════════════════════════════

/* ── 建筑物 ── */
export interface BuildingAttributes {
  id: number;
  unit_id: number;
  name: string;
  type?: string;
  total_floors?: number;
  address?: string;
  remark?: string;
  created_at?: Date;
  updated_at?: Date;
}
export interface BuildingCreationAttributes extends Optional<BuildingAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Building extends Model<BuildingAttributes, BuildingCreationAttributes> implements BuildingAttributes {
  public id!: number;
  public unit_id!: number;
  public name!: string;
  public type?: string;
  public total_floors?: number;
  public address?: string;
  public remark?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Building.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    unit_id: { type: DataTypes.BIGINT, allowNull: false, comment: '所属单位' },
    name: { type: DataTypes.STRING(100), allowNull: false, comment: '建筑物名称' },
    type: { type: DataTypes.STRING(50), comment: '建筑类型：商业/住宅/工业/公共' },
    total_floors: { type: DataTypes.INTEGER, comment: '总层数' },
    address: { type: DataTypes.STRING(255) },
    remark: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: 'buildings',
    timestamps: true,
    underscored: true,
    comment: '建筑物信息',
  }
);

/* ── 楼层/分区 ── */
export interface FloorAttributes {
  id: number;
  building_id: number;
  name: string;
  floor_number: number;
  plan_image_url?: string;
  plan_width?: number;
  plan_height?: number;
  created_at?: Date;
  updated_at?: Date;
}
export interface FloorCreationAttributes extends Optional<FloorAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Floor extends Model<FloorAttributes, FloorCreationAttributes> implements FloorAttributes {
  public id!: number;
  public building_id!: number;
  public name!: string;
  public floor_number!: number;
  public plan_image_url?: string;
  public plan_width?: number;
  public plan_height?: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Floor.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    building_id: { type: DataTypes.INTEGER, allowNull: false, comment: '所属建筑物' },
    name: { type: DataTypes.STRING(50), allowNull: false, comment: '楼层名称：B1/F1/F2/屋顶' },
    floor_number: { type: DataTypes.INTEGER, allowNull: false, comment: '楼层号，用于排序：-1/1/2' },
    plan_image_url: { type: DataTypes.STRING(500), comment: '平面图图片URL' },
    plan_width: { type: DataTypes.INTEGER, comment: '图片原始宽度px' },
    plan_height: { type: DataTypes.INTEGER, comment: '图片原始高度px' },
  },
  {
    sequelize,
    tableName: 'floors',
    timestamps: true,
    underscored: true,
    comment: '楼层/分区信息',
  }
);

/* ── 设备平面图点位 ── */
export interface FloorDevicePositionAttributes {
  id: number;
  floor_id: number;
  device_id: number;
  x: number;  // 百分比 0-100
  y: number;  // 百分比 0-100
  created_at?: Date;
  updated_at?: Date;
}
export interface FloorDevicePositionCreationAttributes extends Optional<FloorDevicePositionAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class FloorDevicePosition extends Model<FloorDevicePositionAttributes, FloorDevicePositionCreationAttributes> implements FloorDevicePositionAttributes {
  public id!: number;
  public floor_id!: number;
  public device_id!: number;
  public x!: number;
  public y!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

FloorDevicePosition.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    floor_id: { type: DataTypes.INTEGER, allowNull: false, comment: '所属楼层' },
    device_id: { type: DataTypes.BIGINT, allowNull: false, comment: '关联设备' },
    x: { type: DataTypes.FLOAT, allowNull: false, comment: 'X坐标百分比' },
    y: { type: DataTypes.FLOAT, allowNull: false, comment: 'Y坐标百分比' },
  },
  {
    sequelize,
    tableName: 'floor_device_positions',
    timestamps: true,
    underscored: true,
    comment: '设备平面图点位',
    indexes: [{ unique: true, fields: ['floor_id', 'device_id'] }],
  }
);

/* ── 摄像头点位绑定（可选） ── */
export interface FloorCameraBindingAttributes {
  id: number;
  floor_id: number;
  camera_device_id: number;
  bound_device_ids?: string; // JSON array string
  x?: number;
  y?: number;
  created_at?: Date;
  updated_at?: Date;
}
export interface FloorCameraBindingCreationAttributes extends Optional<FloorCameraBindingAttributes, 'id' | 'bound_device_ids' | 'x' | 'y' | 'created_at' | 'updated_at'> {}

export class FloorCameraBinding extends Model<FloorCameraBindingAttributes, FloorCameraBindingCreationAttributes> implements FloorCameraBindingAttributes {
  public id!: number;
  public floor_id!: number;
  public camera_device_id!: number;
  public bound_device_ids?: string;
  public x?: number;
  public y?: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

FloorCameraBinding.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    floor_id: { type: DataTypes.INTEGER, allowNull: false },
    camera_device_id: { type: DataTypes.INTEGER, allowNull: false },
    bound_device_ids: { type: DataTypes.TEXT, comment: 'JSON数组：绑定的消防设备ID' },
    x: { type: DataTypes.FLOAT, comment: '摄像头在图上X坐标' },
    y: { type: DataTypes.FLOAT, comment: '摄像头在图上Y坐标' },
  },
  {
    sequelize,
    tableName: 'floor_camera_bindings',
    timestamps: true,
    underscored: true,
  }
);

// ═══════════════════════════════════════════════════════════════════
// 关联关系（需要在 index.ts 的 initModels 中调用）
// ═══════════════════════════════════════════════════════════════════
export function initFloorPlanAssociations(models: any) {
  Building.belongsTo(models.Unit, { foreignKey: 'unit_id', as: 'unit' });
  Building.hasMany(Floor, { foreignKey: 'building_id', as: 'floors' });

  Floor.belongsTo(Building, { foreignKey: 'building_id', as: 'building' });
  Floor.hasMany(FloorDevicePosition, { foreignKey: 'floor_id', as: 'positions' });
  Floor.hasMany(FloorCameraBinding, { foreignKey: 'floor_id', as: 'cameraBindings' });

  FloorDevicePosition.belongsTo(Floor, { foreignKey: 'floor_id', as: 'floor' });
  FloorDevicePosition.belongsTo(models.Device, { foreignKey: 'device_id', as: 'device' });

  FloorCameraBinding.belongsTo(Floor, { foreignKey: 'floor_id', as: 'floor' });
}
