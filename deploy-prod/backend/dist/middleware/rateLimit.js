"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchRateLimiter = exports.exportRateLimiter = exports.userRateLimiter = exports.iotHeartbeatLimiter = exports.iotRateLimiter = exports.authRateLimiter = exports.globalRateLimiter = void 0;
exports.rateLimit = rateLimit;
const redis_1 = __importDefault(require("@/config/redis"));
const logger_1 = __importDefault(require("@/config/logger"));
const response_1 = require("@/utils/response");
const memoryStore = new Map();
const MEM_CLEANUP_MS = 15 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of memoryStore.entries()) {
        if (now > rec.resetTime)
            memoryStore.delete(key);
    }
}, MEM_CLEANUP_MS);
/** 检查 Redis 是否可用 */
async function redisAvailable() {
    try {
        await redis_1.default.ping();
        return true;
    }
    catch {
        return false;
    }
}
/** Redis 原子计数限流 */
async function checkRedisLimit(key, windowMs, max) {
    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
    const pipeline = redis_1.default.pipeline();
    pipeline.incr(windowKey);
    pipeline.pexpire(windowKey, windowMs);
    const results = await pipeline.exec();
    const count = results?.[0]?.[1] || 1;
    return { allowed: count <= max, remaining: Math.max(0, max - count), total: count };
}
/** 内存降级限流 */
function checkMemoryLimit(key, windowMs, max) {
    const now = Date.now();
    const rec = memoryStore.get(key);
    if (!rec || now > rec.resetTime) {
        memoryStore.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: max - 1, total: 1 };
    }
    rec.count++;
    return { allowed: rec.count <= max, remaining: Math.max(0, max - rec.count), total: rec.count };
}
function rateLimit(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000;
    const max = options.max || 1000;
    const keyGenerator = options.keyGenerator || ((req) => `${req.ip}:${req.path}`);
    const message = options.message || '请求过于频繁，请稍后再试';
    const preferRedis = options.useRedis !== false;
    return async (req, res, next) => {
        const key = keyGenerator(req);
        try {
            let result;
            if (preferRedis && await redisAvailable()) {
                result = await checkRedisLimit(key, windowMs, max);
            }
            else {
                result = checkMemoryLimit(key, windowMs, max);
            }
            res.setHeader('X-RateLimit-Limit', String(max));
            res.setHeader('X-RateLimit-Remaining', String(result.remaining));
            if (!result.allowed) {
                logger_1.default.warn(`[RateLimit] 限流触发: ${key} (${result.total}/${max})`);
                res.status(429).json((0, response_1.fail)(message, 429, req.reqId));
                return;
            }
            next();
        }
        catch (err) {
            // 限流检查失败时不阻断请求（降级通过）
            logger_1.default.warn(`[RateLimit] 检查异常: ${err.message}`);
            next();
        }
    };
}
/* ═══════════════════════════════════════════════════════════════════
   预置限流器
   ═══════════════════════════════════════════════════════════════════ */
/** 全局默认限制: 600/分钟 */
exports.globalRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 600 });
/** 认证接口限制: 10/15分钟 */
exports.authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => `auth:${req.ip}`,
    message: '登录尝试次数过多，请15分钟后再试',
});
/** IoT 公共上报接口限制: 120/分钟 */
exports.iotRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    keyGenerator: (req) => `iot:${req.ip}:${req.path}`,
    message: '设备上报频率过高，请稍后再试',
});
/** IoT 心跳接口限制: 60/分钟 */
exports.iotHeartbeatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    keyGenerator: (req) => `iot:hb:${req.ip}`,
    message: '心跳上报频率过高',
});
/** 已认证用户通用限制: 300/分钟（按用户ID，防止刷接口） */
exports.userRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    keyGenerator: (req) => `user:${req.user?.userId || req.ip}:${req.path}`,
    message: '操作过于频繁，请稍后再试',
});
/** 导出/下载限制: 20/分钟（防止大查询拖垮数据库） */
exports.exportRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => `export:${req.user?.userId || req.ip}`,
    message: '导出频率过高，请稍后再试',
});
/** 批量操作限制: 10/分钟（批量删除/导入等） */
exports.batchRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => `batch:${req.user?.userId || req.ip}:${req.path}`,
    message: '批量操作频率过高，请稍后再试',
});
//# sourceMappingURL=rateLimit.js.map