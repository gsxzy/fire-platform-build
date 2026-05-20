export declare class DutyHandoverService {
    static create(data: any): Promise<import("sequelize").Model<any, any>>;
    static list(params: {
        startTime?: string;
        endTime?: string;
        shiftId?: string;
        fromUserId?: string;
        toUserId?: string;
        status?: number;
        pageNum?: number;
        pageSize?: number;
    }): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        pageNum: number;
        pageSize: number;
    }>;
    static byId(id: string): Promise<import("sequelize").Model<any, any> | null>;
    static accept(id: string, toUserId: number, toUserName: string, toSignature?: string): Promise<[affectedCount: number]>;
    /** 获取当前班次待交接的汇总数据 */
    static getHandoverSummary(scheduleId: string): Promise<{
        schedule: any;
        pendingAlarms: number;
        logCount: number;
        logs: import("sequelize").Model<any, any>[];
    } | null>;
}
//# sourceMappingURL=dutyHandover.service.d.ts.map