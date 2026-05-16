/**
 * ═══════════════════════════════════════════════════════════════════
 * 建筑平面图服务
 * 平面图上传、设备点位查询、未标点设备查询
 * ═══════════════════════════════════════════════════════════════════
 */
export declare class FloorPlanService {
    /**
     * 上传平面图
     * 实际项目请替换为 OSS 上传逻辑
     */
    static uploadPlan(floorId: number, file: Express.Multer.File): Promise<{
        url: string;
        width: number;
        height: number;
    }>;
    /**
     * 获取楼层已标点设备（带设备详情）
     */
    static getFloorDevices(floorId: number): Promise<{
        position_id: any;
        device_id: any;
        x: any;
        y: any;
        device_name: any;
        device_code: any;
        device_type: any;
        status: any;
    }[]>;
    /**
     * 获取未标点设备（该单位下还没在楼层上标注的设备）
     */
    static getUnmarkedDevices(floorId: number): Promise<import("sequelize").Model<any, any>[]>;
}
//# sourceMappingURL=floorPlan.service.d.ts.map