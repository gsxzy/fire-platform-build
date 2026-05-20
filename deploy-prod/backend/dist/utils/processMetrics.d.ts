/**
 * ═══════════════════════════════════════════════════════════════════
 * 进程级运行时指标采集
 * Event loop lag、CPU 占用、active handles 等
 * ═══════════════════════════════════════════════════════════════════
 */
interface ProcessMetricsSnapshot {
    timestamp: number;
    eventLoopLagMs: number;
    cpuUsage: {
        userPercent: number;
        systemPercent: number;
        loadAvg: number[];
        cores: number;
    };
    memory: {
        rssMB: number;
        heapUsedMB: number;
        heapTotalMB: number;
        externalMB: number;
        arrayBuffersMB: number;
        systemTotalMB: number;
        systemFreeMB: number;
        processPercent: number;
    };
    process: {
        pid: number;
        uptime: number;
        activeHandles: number;
        activeRequests: number;
    };
}
export declare class ProcessMetricsCollector {
    private lastCpuUsage;
    private lastCpuTime;
    /** 测量 event loop lag（精确到微秒级） */
    measureEventLoopLag(): Promise<number>;
    snapshot(): Promise<ProcessMetricsSnapshot>;
}
export declare const processMetrics: ProcessMetricsCollector;
export {};
//# sourceMappingURL=processMetrics.d.ts.map