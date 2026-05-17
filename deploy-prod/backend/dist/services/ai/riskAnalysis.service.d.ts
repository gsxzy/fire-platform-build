export interface RiskAnalysisResult {
    isReal: boolean;
    confidence: number;
    fireLevel: number;
    spreadPrediction: any[];
    recommendedActions: string[];
    decision: string;
}
export declare class AIAriskAnalysisService {
    /**
     * 分析告警风险
     */
    static analyzeAlarm(alarmId: number): Promise<RiskAnalysisResult>;
    /**
     * 火情真伪识别
     */
    private static detectRealAlarm;
    /**
     * 火情等级判定
     */
    private static assessFireLevel;
    /**
     * 火势蔓延预测
     */
    private static predictSpread;
    /**
     * 最优联动策略推荐
     */
    private static recommendActions;
    /**
     * 生成决策结论
     */
    private static generateDecision;
    /**
     * 批量分析告警
     */
    static batchAnalyze(alarmIds: number[]): Promise<Map<number, RiskAnalysisResult>>;
}
//# sourceMappingURL=riskAnalysis.service.d.ts.map