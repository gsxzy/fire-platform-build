export declare class ReportService {
    static generateDailyReport(date: string): Promise<{
        type: string;
        date: string;
        summary: {
            alarmCount: number;
            fireCount: number;
            faultCount: number;
            deviceOnline: number;
            deviceTotal: number;
            deviceRate: string | number;
            workOrderDone: number;
            patrolCount: number;
            hazardFound: number;
            inspectionDone: number;
        };
        alarms: import("sequelize").Model<any, any>[];
    }>;
    static generateWeeklyReport(endDate: string): Promise<{
        type: string;
        startDate: string;
        endDate: string;
        summary: {
            alarmCount: number;
            workOrderTotal: number;
            patrolTotal: number;
            hazardTotal: number;
        };
        trend: any[];
    }>;
    static generateMonthlyReport(year: number, month: number): Promise<{
        type: string;
        year: number;
        month: number;
        summary: {
            alarmCount: number;
            workOrderTotal: number;
            patrolTotal: number;
            hazardTotal: number;
            inspectionTotal: number;
        };
        trend: any[];
        byType: import("sequelize").Model<any, any>[];
    }>;
    static generateDeviceReport(unitId?: number): Promise<{
        total: number;
        devices: import("sequelize").Model<any, any>[];
        byType: import("sequelize").Model<any, any>[];
    }>;
    static generateMaintenanceReport(startDate: string, endDate: string): Promise<{
        total: number;
        orders: import("sequelize").Model<any, any>[];
        byStatus: import("sequelize").Model<any, any>[];
    }>;
    static generatePatrolReport(startDate: string, endDate: string): Promise<{
        total: number;
        records: import("sequelize").Model<any, any>[];
        byResult: import("sequelize").Model<any, any>[];
    }>;
    private static getDailyTrend;
}
//# sourceMappingURL=report.service.d.ts.map