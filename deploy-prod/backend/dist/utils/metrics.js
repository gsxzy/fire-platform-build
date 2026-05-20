"use strict";
/**
 * ═══════════════════════════════════════════════════════════════════
 * 轻量级内存指标收集器（增强版）
 * 用于 /system/metrics 端点暴露基础运行数据
 * 新增：P99/P95 延迟、延迟分布直方图
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = void 0;
const MAX_DURATION_SAMPLES = 1000;
class MetricsCollector {
    routes = new Map();
    startedAt = Date.now();
    totalRequests = 0;
    totalErrors = 0;
    record(method, path, status, duration, slowThreshold = 1000) {
        const key = `${method} ${path}`;
        let m = this.routes.get(key);
        if (!m) {
            m = { count: 0, errors: 0, slow: 0, totalDuration: 0, maxDuration: 0, durations: [], statusCodes: {} };
            this.routes.set(key, m);
        }
        m.count++;
        m.totalDuration += duration;
        if (duration > m.maxDuration)
            m.maxDuration = duration;
        if (duration > slowThreshold)
            m.slow++;
        if (status >= 400) {
            m.errors++;
            this.totalErrors++;
        }
        m.statusCodes[status] = (m.statusCodes[status] || 0) + 1;
        // 保留最近 N 个延迟样本
        m.durations.push(duration);
        if (m.durations.length > MAX_DURATION_SAMPLES) {
            m.durations.shift();
        }
        this.totalRequests++;
    }
    percentile(sorted, p) {
        if (sorted.length === 0)
            return 0;
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    }
    snapshot(topN = 30) {
        const entries = Array.from(this.routes.entries())
            .map(([key, m]) => {
            const sorted = [...m.durations].sort((a, b) => a - b);
            return {
                key,
                count: m.count,
                errors: m.errors,
                slow: m.slow,
                avgDuration: m.count > 0 ? Math.round(m.totalDuration / m.count) : 0,
                p50: this.percentile(sorted, 50),
                p95: this.percentile(sorted, 95),
                p99: this.percentile(sorted, 99),
                maxDuration: m.maxDuration,
                errorRate: m.count > 0 ? Math.round((m.errors / m.count) * 1000) / 10 : 0,
                statusCodes: m.statusCodes,
            };
        })
            .sort((a, b) => b.count - a.count)
            .slice(0, topN);
        const mem = process.memoryUsage();
        return {
            uptime: Math.round((Date.now() - this.startedAt) / 1000),
            totalRequests: this.totalRequests,
            totalErrors: this.totalErrors,
            totalRoutes: this.routes.size,
            memory: {
                rss: Math.round(mem.rss / 1024 / 1024),
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                external: Math.round(mem.external / 1024 / 1024),
            },
            routes: entries,
        };
    }
    reset() {
        this.routes.clear();
        this.startedAt = Date.now();
        this.totalRequests = 0;
        this.totalErrors = 0;
    }
}
exports.metrics = new MetricsCollector();
//# sourceMappingURL=metrics.js.map