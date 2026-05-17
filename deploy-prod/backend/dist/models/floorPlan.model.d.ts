import { Model, Optional } from 'sequelize';
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
export interface BuildingCreationAttributes extends Optional<BuildingAttributes, 'id' | 'created_at' | 'updated_at'> {
}
export declare class Building extends Model<BuildingAttributes, BuildingCreationAttributes> implements BuildingAttributes {
    id: number;
    unit_id: number;
    name: string;
    type?: string;
    total_floors?: number;
    address?: string;
    remark?: string;
    readonly created_at: Date;
    readonly updated_at: Date;
}
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
export interface FloorCreationAttributes extends Optional<FloorAttributes, 'id' | 'created_at' | 'updated_at'> {
}
export declare class Floor extends Model<FloorAttributes, FloorCreationAttributes> implements FloorAttributes {
    id: number;
    building_id: number;
    name: string;
    floor_number: number;
    plan_image_url?: string;
    plan_width?: number;
    plan_height?: number;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export interface FloorDevicePositionAttributes {
    id: number;
    floor_id: number;
    device_id: number;
    x: number;
    y: number;
    created_at?: Date;
    updated_at?: Date;
}
export interface FloorDevicePositionCreationAttributes extends Optional<FloorDevicePositionAttributes, 'id' | 'created_at' | 'updated_at'> {
}
export declare class FloorDevicePosition extends Model<FloorDevicePositionAttributes, FloorDevicePositionCreationAttributes> implements FloorDevicePositionAttributes {
    id: number;
    floor_id: number;
    device_id: number;
    x: number;
    y: number;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export interface FloorCameraBindingAttributes {
    id: number;
    floor_id: number;
    camera_device_id: number;
    bound_device_ids?: string;
    x?: number;
    y?: number;
    created_at?: Date;
    updated_at?: Date;
}
export interface FloorCameraBindingCreationAttributes extends Optional<FloorCameraBindingAttributes, 'id' | 'bound_device_ids' | 'x' | 'y' | 'created_at' | 'updated_at'> {
}
export declare class FloorCameraBinding extends Model<FloorCameraBindingAttributes, FloorCameraBindingCreationAttributes> implements FloorCameraBindingAttributes {
    id: number;
    floor_id: number;
    camera_device_id: number;
    bound_device_ids?: string;
    x?: number;
    y?: number;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export declare function initFloorPlanAssociations(models: any): void;
//# sourceMappingURL=floorPlan.model.d.ts.map