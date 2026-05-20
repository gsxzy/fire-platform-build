"use strict";
/**
 * ═══════════════════════════════════════════════════════════════════
 * 进程级运行时指标采集
 * Event loop lag、CPU 占用、active handles 等
 * ═══════════════════════════════════════════════════════════════════
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMetrics = exports.ProcessMetricsCollector = void 0;
const os_1 = __importDefault(require("os"));
class ProcessMetricsCollector {
    lastCpuUsage = process.cpuUsage();
    lastCpuTime = process.hrtime.bigint();
    /** 测量 event loop lag（精确到微秒级） */
    measureEventLoopLag() {
        return new Promise((resolve) => {
            const start = process.hrtime.bigint();
            setImmediate(() => {
                const lagNs = process.hrtime.bigint() - start;
                resolve(Number(lagNs) / 1_000_000); // 转换为毫秒
            });
        });
    }
    async snapshot() {
        const eventLoopLagMs = await this.measureEventLoopLag();
        const mem = process.memoryUsage();
        const currentCpu = process.cpuUsage(this.lastCpuUsage);
        const currentTime = process.hrtime.bigint();
        const elapsedUs = Number(currentTime - this.lastCpuTime) / 1000; // 纳秒→微秒
        // 更新基准
        this.lastCpuUsage = process.cpuUsage();
        this.lastCpuTime = currentTime;
        const userPercent = elapsedUs > 0 ? Math.round((currentCpu.user / elapsedUs) * 1000) / 10 : 0;
        const systemPercent = elapsedUs > 0 ? Math.round((currentCpu.system / elapsedUs) * 1000) / 10 : 0;
        const sysTotal = os_1.default.totalmem();
        const sysFree = os_1.default.freemem();
        return {
            timestamp: Date.now(),
            eventLoopLagMs: Math.round(eventLoopLagMs * 1000) / 1000,
            cpuUsage: {
                userPercent,
                systemPercent,
                loadAvg: os_1.default.loadavg().map(v => Math.round(v * 100) / 100),
                cores: os_1.default.cpus().length,
            },
            memory: {
                rssMB: Math.round(mem.rss / 1024 / 1024),
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
                externalMB: Math.round((mem.external || 0) / 1024 / 1024),
                arrayBuffersMB: Math.round((mem.arrayBuffers || 0) / 1024 / 1024),
                systemTotalMB: Math.round(sysTotal / 1024 / 1024),
                systemFreeMB: Math.round(sysFree / 1024 / 1024),
                processPercent: sysTotal > 0 ? Math.round((mem.rss / sysTotal) * 1000) / 10 : 0,
            },
            process: {
                pid: process.pid,
                uptime: Math.round(process.uptime()),
                activeHandles: process._getActiveHandles?.().length || 0,
                activeRequests: process._getActiveRequests?.().length || 0,
            },
        };
    }
}
exports.ProcessMetricsCollector = ProcessMetricsCollector;
exports.processMetrics = new ProcessMetricsCollector();
//# sourceMappingURL=processMetrics.js.map