/**
 * ═══════════════════════════════════════════════════════════════════
 * 轻量级内存指标收集器（增强版）
 * 用于 /system/metrics 端点暴露基础运行数据
 * 新增：P99/P95 延迟、延迟分布直方图
 * ═══════════════════════════════════════════════════════════════════
 */
declare class MetricsCollector {
    private routes;
    private startedAt;
    private totalRequests;
    private totalErrors;
    record(method: string, path: string, status: number, duration: number, slowThreshold?: number): void;
    private percentile;
    snapshot(topN?: number): {
        uptime: number;
        totalRequests: number;
        totalErrors: number;
        totalRoutes: number;
        memory: {
            rss: number;
            heapUsed: number;
            heapTotal: number;
            external: number;
        };
        routes: {
            key: string;
            count: number;
            errors: number;
            slow: number;
            avgDuration: number;
            p50: number;
            p95: number;
            p99: number;
            maxDuration: number;
            errorRate: number;
            statusCodes: Record<number, number>;
        }[];
    };
    reset(): void;
}
export declare const metrics: MetricsCollector;
export {};
//# sourceMappingURL=metrics.d.ts.map