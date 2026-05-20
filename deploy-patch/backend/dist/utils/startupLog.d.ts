/**
 * ═══════════════════════════════════════════════════════════════════
 * 启动日志工具 — 结构化配置快照 + 启动性能计时
 * ═══════════════════════════════════════════════════════════════════
 */
export declare class StartupLog {
    private steps;
    private overallStart;
    private currentStep;
    begin(name: string): void;
    success(name?: string): void;
    fail(name: string, error: string): void;
    /** 记录配置快照（脱敏后的关键配置） */
    snapshotConfig(): void;
    /** 记录启动完成汇总 */
    finish(): {
        totalDurationMs: number;
        totalSteps: number;
        successSteps: number;
        failedSteps: number;
        stepDetails: {
            name: string;
            durationMs: number;
            status: "running" | "success" | "failed";
        }[];
    };
}
export declare const startupLog: StartupLog;
//# sourceMappingURL=startupLog.d.ts.map