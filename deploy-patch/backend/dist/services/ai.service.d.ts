import type { Request } from 'express';
export declare class AIService {
    static riskAnalysis(scene: string, inputData: any): Promise<{
        id: any;
        decisionNo: string;
        riskLevel: "medium" | "low" | "high";
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
    static situationAssessment(): Promise<import("./ai/aiProvider.interface").SituationResult>;
    static getTrend(days?: number): Promise<any[]>;
    static overview(): Promise<{
        radarData: {
            subject: any;
            A: number;
            B: number;
        }[];
        decisions: {
            id: any;
            title: any;
            type: string;
            status: string;
            confidence: number;
            time: string;
            content: any;
            scene: any;
            analysis: any;
        }[];
        stats: {
            todayDecision: number;
            active: number;
            handled: number;
            avgConfidence: number;
            responseTime: string;
        };
    }>;
    static executeDecision(decisionId: number, operatorId?: number, operatorName?: string): Promise<{
        executed: boolean;
        workOrderId: any;
        workOrderNo: string;
        message: string;
    }>;
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