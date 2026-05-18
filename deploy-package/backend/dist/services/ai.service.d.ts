import type { Request } from 'express';
export declare class AIService {
    static riskAnalysis(scene: string, inputData: any): Promise<{
        id: any;
        decisionNo: string;
        riskLevel: string;
        suggestion: string;
        confidence: number;
        analysis: {
            alarmFreq: number;
            faultCount: number;
            fireCount: number;
        };
    }>;
    static filterFalseAlarms(alarmId: number): Promise<{
        isFalseAlarm: boolean;
        confidence: number;
        reason?: undefined;
    } | {
        isFalseAlarm: boolean;
        confidence: number;
        reason: string;
    }>;
    static generateSmartAlert(deviceId: number): Promise<{
        alert_no: string;
        alert_type: number;
        device_id: number;
        device_name: any;
        alert_desc: string;
        predict_time: Date;
        confidence: number;
    }[] | null>;
    static situationAssessment(): Promise<{
        situation: string;
        onlineRate: string;
        todayAlarm: number;
        deviceStats: import("sequelize").Model<any, any>[];
        alarmStats: import("sequelize").Model<any, any>[];
    }>;
    static getTrend(days?: number): Promise<any[]>;
    static decisionList(req: Request): Promise<{
        rows: import("sequelize").Model<any, any>[];
        count: number;
        pageNum: number;
        pageSize: number;
    }>;
    static decisionCreate(body: any): Promise<{
        id: any;
        decisionNo: string;
    }>;
    static alertList(req: Request): Promise<{
        rows: import("sequelize").Model<any, any>[];
        count: number;
        pageNum: number;
        pageSize: number;
    }>;
    static alertConfirm(id: string | number): Promise<{
        confirmed: boolean;
    }>;
    static alertHandle(id: string | number): Promise<{
        handled: boolean;
    }>;
}
//# sourceMappingURL=ai.service.d.ts.map