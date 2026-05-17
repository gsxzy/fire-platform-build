export declare class GISService {
    static getMapPoints(): Promise<{
        units: import("sequelize").Model<any, any>[];
        devices: import("sequelize").Model<any, any>[];
        activeAlarms: import("sequelize").Model<any, any>[];
    }>;
    static getRegionSituation(): Promise<any[]>;
    static getAlarmPoints(): Promise<import("sequelize").Model<any, any>[]>;
    static updateDeviceLocation(deviceId: number, lng: number, lat: number): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=gis.service.d.ts.map