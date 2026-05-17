export interface IssueRecord {
    deviceId: string;
    deviceName?: string;
    issueType: string;
    symptoms?: string;
    rootCause?: string;
    solution?: string;
    status?: number;
    sourceIp?: string;
    resolvedBy?: string;
}
export interface DiagnoseResult {
    deviceId: string;
    totalOccurrences: number;
    similarIssues: Array<{
        id: number;
        issueType: string;
        symptoms: string;
        rootCause: string;
        solution: string;
        occurrenceCount: number;
        lastOccurrence: string;
        status: number;
    }>;
    suggestion: string;
}
export declare class AILearningService {
    /**
     * 记录一次故障事件（自动累加次数）
     */
    static recordIssue(data: IssueRecord): Promise<any>;
    /**
     * 智能诊断：查询某设备的历史故障并生成建议
     */
    static diagnose(deviceId: string, symptoms?: string): Promise<DiagnoseResult>;
    /**
     * 按故障类型统计 TOP N
     */
    static statsByType(limit?: number): Promise<{
        issueType: any;
        totalCount: number;
        recordCount: number;
        label: string;
    }[]>;
    /**
     * 按设备统计 TOP N
     */
    static statsByDevice(limit?: number): Promise<{
        deviceId: any;
        deviceName: any;
        totalCount: number;
    }[]>;
    /**
     * 更新故障状态或解决方案
     */
    static updateIssue(id: number, data: Partial<IssueRecord>): Promise<any>;
    /**
     * 故障类型中文映射
     */
    private static translateIssueType;
}
//# sourceMappingURL=aiLearning.service.d.ts.map