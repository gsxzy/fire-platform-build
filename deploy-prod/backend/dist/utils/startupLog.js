"use strict";
/**
 * ═══════════════════════════════════════════════════════════════════
 * 启动日志工具 — 结构化配置快照 + 启动性能计时
 * ═══════════════════════════════════════════════════════════════════
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startupLog = exports.StartupLog = void 0;
const logger_1 = __importDefault(require("@/config/logger"));
class StartupLog {
    steps = [];
    overallStart = Date.now();
    currentStep = null;
    begin(name) {
        if (this.currentStep) {
            this.currentStep.endedAt = Date.now();
            this.currentStep.durationMs = this.currentStep.endedAt - this.currentStep.startedAt;
            if (this.currentStep.status === 'running') {
                this.currentStep.status = 'success';
            }
        }
        const step = {
            name,
            startedAt: Date.now(),
            status: 'running',
        };
        this.steps.push(step);
        this.currentStep = step;
        logger_1.default.info(`[Startup] ▶ ${name}...`);
    }
    success(name) {
        const step = name ? this.steps.find(s => s.name === name) : this.currentStep;
        if (!step)
            return;
        step.endedAt = Date.now();
        step.durationMs = step.endedAt - step.startedAt;
        step.status = 'success';
        logger_1.default.info(`[Startup] ✓ ${step.name} — ${step.durationMs}ms`);
    }
    fail(name, error) {
        const step = this.steps.find(s => s.name === name);
        if (!step)
            return;
        step.endedAt = Date.now();
        step.durationMs = step.endedAt - step.startedAt;
        step.status = 'failed';
        step.error = error;
        logger_1.default.error(`[Startup] ✗ ${step.name} — ${step.durationMs}ms — ${error}`);
    }
    /** 记录配置快照（脱敏后的关键配置） */
    snapshotConfig() {
        const env = process.env.NODE_ENV || 'development';
        const snapshot = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            env,
            port: process.env.PORT || '3000',
            dbHost: process.env.DB_HOST || 'localhost',
            dbPort: process.env.DB_PORT || '3306',
            dbName: process.env.DB_NAME || 'unknown',
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: process.env.REDIS_PORT || '6379',
            logLevel: process.env.LOG_LEVEL || 'info',
            trustProxy: process.env.TRUST_PROXY === '1',
            corsOrigin: process.env.CORS_ORIGIN || 'default',
            features: {
                websocket: true,
                iotGateway: true,
                gb26875: true,
                fscn8001: true,
                canet: true,
                cronJobs: true,
            },
        };
        logger_1.default.info('[Startup] 配置快照', snapshot);
    }
    /** 记录启动完成汇总 */
    finish() {
        if (this.currentStep) {
            this.currentStep.endedAt = Date.now();
            this.currentStep.durationMs = this.currentStep.endedAt - this.currentStep.startedAt;
            if (this.currentStep.status === 'running') {
                this.currentStep.status = 'success';
            }
        }
        const totalMs = Date.now() - this.overallStart;
        const failedSteps = this.steps.filter(s => s.status === 'failed');
        const summary = {
            totalDurationMs: totalMs,
            totalSteps: this.steps.length,
            successSteps: this.steps.filter(s => s.status === 'success').length,
            failedSteps: failedSteps.length,
            stepDetails: this.steps.map(s => ({
                name: s.name,
                durationMs: s.durationMs || 0,
                status: s.status,
            })),
        };
        if (failedSteps.length > 0) {
            logger_1.default.error('[Startup] 启动失败汇总', summary);
        }
        else {
            logger_1.default.info('[Startup] 启动完成汇总', summary);
        }
        return summary;
    }
}
exports.StartupLog = StartupLog;
exports.startupLog = new StartupLog();
//# sourceMappingURL=startupLog.js.map