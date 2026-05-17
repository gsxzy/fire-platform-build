export declare class DutyService {
    static createSchedule(data: any): Promise<import("sequelize").Model<any, any>>;
    static getSchedules(startDate: string, endDate: string, pageNum?: number, pageSize?: number): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        pageNum: number;
        pageSize: number;
    }>;
    static getScheduleById(id: string): Promise<import("sequelize").Model<any, any> | null>;
    static updateSchedule(id: string, data: any): Promise<[affectedCount: number]>;
    static deleteSchedule(id: string): Promise<number>;
    static checkIn(userId: number, userName: string): Promise<import("sequelize").Model<any, any>>;
    static checkOut(userId: number, handoverContent: string, incidents?: string): Promise<{
        success: boolean;
    }>;
    static getDutyLogs(pageNum?: number, pageSize?: number, userId?: number): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        pageNum: number;
        pageSize: number;
    }>;
    static checkAbsence(): Promise<import("sequelize").Model<any, any>[]>;
    static getCurrentDuty(): Promise<import("sequelize").Model<any, any>[]>;
}
//# sourceMappingURL=duty.service.d.ts.map