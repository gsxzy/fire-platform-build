export declare class DispatchService {
    static list(params: {
        status?: string;
        phase?: string;
        alarmType?: number;
        keyword?: string;
        startTime?: string;
        endTime?: string;
        handlerId?: number;
        pageNum?: number;
        pageSize?: number;
    }): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        pageNum: number;
        pageSize: number;
    }>;
    static byId(id: string): Promise<import("sequelize").Model<any, any> | null>;
    static stats(): Promise<{
        total: number;
        new: number;
        dispatched: number;
        handling: number;
        resolved: number;
        falseAlarm: number;
        overdue: number;
    }>;
    /** 派单 */
    static dispatch(id: string, handlerId: number, handlerName: string, note?: string): Promise<{
        success: boolean;
    }>;
    /** 转派 */
    static transfer(id: string, newHandlerId: number, newHandlerName: string, note?: string): Promise<{
        success: boolean;
    }>;
    /** 标记处置中 */
    static startHandling(id: string, note?: string): Promise<{
        success: boolean;
    }>;
    /** 标记完成 */
    static resolve(id: string, result: string, note?: string): Promise<{
        success: boolean;
        responseSeconds: number;
    }>;
    /** 标记误报 */
    static markFalseAlarm(id: string, note?: string): Promise<{
        success: boolean;
    }>;
    /** 从告警创建接警处置记录（告警联动入口） */
    static createFromAlarm(alarm: any): Promise<import("sequelize").Model<any, any>>;
    /** 超时检测（定时任务调用） */
    static checkOverdue(): Promise<number>;
}
//# sourceMappingURL=dispatch.service.d.ts.map