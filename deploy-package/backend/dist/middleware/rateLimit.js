"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.globalRateLimiter = void 0;
exports.rateLimit = rateLimit;
const logger_1 = __importDefault(require("@/config/logger"));
const response_1 = require("@/utils/response");
const store = new Map();
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
function cleanup() {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
        if (now > record.resetTime)
            store.delete(key);
    }
}
setInterval(cleanup, CLEANUP_INTERVAL_MS);
function rateLimit(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000;
    const max = options.max || 1000;
    const keyGenerator = options.keyGenerator || ((req) => `${req.ip}:${req.path}`);
    const message = options.message || '请求过于频繁，请稍后再试';
    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();
        const record = store.get(key);
        if (!record || now > record.resetTime) {
            store.set(key, { count: 1, resetTime: now + windowMs });
            res.setHeader('X-RateLimit-Limit', String(max));
            res.setHeader('X-RateLimit-Remaining', String(max - 1));
            next();
            return;
        }
        record.count++;
        const remaining = Math.max(0, max - record.count);
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        if (record.count > max) {
            logger_1.default.warn(`[RateLimit] 限流触发: ${key} (${record.count}/${max})`);
            res.status(429).json((0, response_1.fail)(message, 429, req.reqId));
            return;
        }
        next();
    };
}
/* 全局默认限制: 600/分钟 */
exports.globalRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 600 });
/* 认证接口限制: 10/15分钟 */
exports.authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => `auth:${req.ip}`,
    message: '登录尝试次数过多，请15分钟后再试',
});
//# sourceMappingURL=rateLimit.js.map