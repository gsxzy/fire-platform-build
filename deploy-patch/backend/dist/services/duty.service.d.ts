export declare class DutyService {
    static createSchedule(data: any): Promise<import("sequelize").Model<any, any>>;
    static getSchedules(startDate?: string, endDate?: string, shiftId?: string, pageNum?: number, pageSize?: number): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        pageNum: number;
        pageSize: number;
    }>;
    static getScheduleById(id: string): Promise<import("sequelize").Model<any, any> | null>;
    static updateSchedule(id: string, data: any): Promise<[affectedCount: number]>;
    static deleteSchedule(id: string): Promise<number>;
    static checkIn(userId: number, userName: string, scheduleId?: number): Promise<import("sequelize").Model<any, any>>;
    static checkOut(userId: number, handoverContent: string, incidents?: string): Promise<{
        success: boolean;
    }>;
    static getDutyLogs(pageNum?: number, pageSize?: number, filters?: {
        userId?: number;
        eventType?: number;
        eventSource?: string;
        startTime?: string;
        endTime?: string;
        scheduleId?: number;
    }): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        pageNum: number;
        pageSize: number;
    }>;
    /** 手动记录日志 */
    static addManualLog(userId: number, userName: string, data: {
        scheduleId?: number;
        content: string;
        attachments?: string;
        eventSource?: string;
    }): Promise<import("sequelize").Model<any, any>>;
    /** 自动记录日志（告警联动等） */
    static addAutoLog(data: {
        scheduleId?: number;
        userId?: number;
        userName?: string;
        eventSource: string;
        sourceId?: number;
        content: string;
    }): Promise<import("sequelize").Model<any, any>>;
    /** 按班次自动汇总生成值班日志 */
    static generateShiftSummary(scheduleId: string): Promise<{
        schedule: any;
        summaryContent: string;
        autoCount: number;
        manualCount: number;
        totalCount: number;
    }>;
    static getCurrentDuty(): Promise<import("sequelize").Model<any, any>[]>;
    static checkAbsence(): Promise<import("sequelize").Model<any, any>[]>;
}
//# sourceMappingURL=duty.service.d.ts.map