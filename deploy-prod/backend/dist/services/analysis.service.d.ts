export declare class AnalysisService {
    static deviceAnalysis(days?: number): Promise<{
        byType: import("sequelize").Model<any, any>[];
        byStatus: import("sequelize").Model<any, any>[];
        onlineTrend: any[];
        faultTrend: import("sequelize").Model<any, any>[];
    }>;
    static alarmAnalysis(days?: number): Promise<{
        byType: import("sequelize").Model<any, any>[];
        byLevel: import("sequelize").Model<any, any>[];
        byHour: import("sequelize").Model<any, any>[];
        byUnit: import("sequelize").Model<any, any>[];
    }>;
    static maintenanceAnalysis(): Promise<{
        byStatus: import("sequelize").Model<any, any>[];
        byType: import("sequelize").Model<any, any>[];
        monthly: import("sequelize").Model<any, any>[];
    }>;
    static hazardAnalysis(): Promise<{
        byType: import("sequelize").Model<any, any>[];
        byLevel: import("sequelize").Model<any, any>[];
        byStatus: import("sequelize").Model<any, any>[];
        monthly: import("sequelize").Model<any, any>[];
    }>;
    static patrolCompletion(days?: number): Promise<{
        total: number;
        normal: number;
        abnormal: number;
        rate: string | number;
    }>;
    private static getDeviceOnlineTrend;
}
//# sourceMappingURL=analysis.service.d.ts.map