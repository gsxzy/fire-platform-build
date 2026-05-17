export declare class AlarmService {
    static createAlarm(data: any): Promise<import("sequelize").Model<any, any>>;
    static handleAlarm(id: number, userId: number, userName: string, result: string): Promise<{
        success: boolean;
    }>;
    static confirmAlarm(id: number): Promise<{
        success: boolean;
    }>;
    static getTrend(days?: number): Promise<any[]>;
    static getLevelStats(): Promise<import("sequelize").Model<any, any>[]>;
    static getUnitAlarmRank(limit?: number): Promise<import("sequelize").Model<any, any>[]>;
    static silenceAlarm(id: number): Promise<{
        success: boolean;
    }>;
    static batchHandle(ids: number[], userId: number, userName: string, result: string): Promise<{
        success: boolean;
        count: number;
    }>;
}
//# sourceMappingURL=alarm.service.d.ts.map