"use strict";
/**
 * security.middleware.ts — 安全加固中间件
 *
 * 1. 安全响应头（CSP / HSTS / X-Frame-Options 等）
 * 2. 基于 Redis 的 IP + 用户级限流
 * 3. 敏感数据响应脱敏
 * 4. SQL 注入预检测
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = securityHeaders;
exports.setRateLimitRedis = setRateLimitRedis;
exports.rateLimitByIP = rateLimitByIP;
exports.rateLimitByUser = rateLimitByUser;
exports.sensitiveDataFilter = sensitiveDataFilter;
exports.sqlInjectionPreCheck = sqlInjectionPreCheck;
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../config/logger"));
/* ============================================================
   1. 安全响应头
   ============================================================ */
function securityHeaders() {
    return (_req, res, next) => {
        // 防止 MIME 类型嗅探
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // 防止点击劫持
        res.setHeader('X-Frame-Options', 'DENY');
        // XSS 过滤（旧版浏览器兼容）
        res.setHeader('X-XSS-Protection', '1; mode=block');
        // 禁止 referrer 泄露到外部
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        // HSTS（强制 HTTPS，仅生产环境）
        if (process.env.NODE_ENV === 'production') {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
        // CSP（内容安全策略）
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; ');
        res.setHeader('Content-Security-Policy', csp);
        // Permissions Policy
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        next();
    };
}
let redisClient = null;
function setRateLimitRedis(client) {
    redisClient = client;
}
function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
async function checkLimit(key, opts) {
    if (!redisClient) {
        // 降级：无 Redis 时允许通过
        return { allowed: true, remaining: opts.max, resetTime: Date.now() + opts.windowMs };
    }
    const now = Date.now();
    const windowStart = now - opts.windowMs;
    const redisKey = `ratelimit:${opts.keyPrefix || 'default'}:${key}`;
    const stored = await redisClient.get(redisKey);
    let requests = [];
    if (stored) {
        try {
            requests = JSON.parse(stored).filter((t) => t > windowStart);
        }
        catch {
            requests = [];
        }
    }
    if (requests.length >= opts.max) {
        const oldest = requests[0] || now;
        return { allowed: false, remaining: 0, resetTime: oldest + opts.windowMs };
    }
    requests.push(now);
    await redisClient.setex(redisKey, Math.ceil(opts.windowMs / 1000), JSON.stringify(requests));
    return {
        allowed: true,
        remaining: opts.max - requests.length,
        resetTime: now + opts.windowMs,
    };
}
function rateLimitByIP(opts) {
    return async (req, res, next) => {
        const ip = getClientIP(req);
        const result = await checkLimit(ip, { ...opts, keyPrefix: opts.keyPrefix || 'ip' });
        res.setHeader('X-RateLimit-Limit', opts.max.toString());
        res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
        if (!result.allowed) {
            res.status(429).json((0, response_1.fail)(opts.message || '请求过于频繁，请稍后再试', 429, req.reqId));
            res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
            return;
        }
        next();
    };
}
function rateLimitByUser(opts) {
    return async (req, res, next) => {
        const userId = req.user?.id || req.ip || 'anonymous';
        const result = await checkLimit(String(userId), { ...opts, keyPrefix: opts.keyPrefix || 'user' });
        res.setHeader('X-RateLimit-Limit', opts.max.toString());
        res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
        if (!result.allowed) {
            res.status(429).json((0, response_1.fail)(opts.message || '操作过于频繁，请稍后再试', 429, req.reqId));
            res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
            return;
        }
        next();
    };
}
/* ============================================================
   3. 敏感数据脱敏
   ============================================================ */
const SENSITIVE_KEYS = [
    'password',
    'passwd',
    'pwd',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'auth',
    'credential',
    'privateKey',
    'private_key',
    'jwt',
    'cookie',
    'session',
    'authorization',
];
const MASK_PATTERNS = [
    {
        pattern: /^\d{17}[\dXx]$/,
        mask: (v) => v.slice(0, 6) + '********' + v.slice(-4),
    },
    {
        pattern: /^1[3-9]\d{9}$/,
        mask: (v) => v.slice(0, 3) + '****' + v.slice(-4),
    },
    {
        pattern: /^\d{4}-\d{4}-\d{4}-\d{4}$/,
        mask: (v) => '****-****-****-' + v.slice(-4),
    },
];
function maskValue(key, value) {
    if (value === null || value === undefined)
        return value;
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
        if (typeof value === 'string') {
            if (value.length <= 8)
                return '***';
            return value.slice(0, 4) + '...' + value.slice(-4);
        }
        return '***';
    }
    if (typeof value === 'string') {
        for (const { pattern, mask } of MASK_PATTERNS) {
            if (pattern.test(value))
                return mask(value);
        }
    }
    return value;
}
function deepMask(obj, visited = new WeakSet()) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj !== 'object')
        return obj;
    if (visited.has(obj))
        return '[Circular]';
    if (obj instanceof Date)
        return obj.toISOString();
    if (obj instanceof RegExp)
        return obj.toString();
    if (ArrayBuffer.isView(obj))
        return `[${obj.constructor.name}]`;
    if (Array.isArray(obj)) {
        visited.add(obj);
        const result = obj.map((item) => deepMask(item, visited));
        return result;
    }
    visited.add(obj);
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = typeof value === 'object' && value !== null
            ? deepMask(value, visited)
            : maskValue(key, value);
    }
    return result;
}
function sensitiveDataFilter() {
    return (_req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            if (body && typeof body === 'object') {
                try {
                    const masked = deepMask(body);
                    return originalJson(masked);
                }
                catch {
                    return originalJson(body);
                }
            }
            return originalJson(body);
        };
        next();
    };
}
/* ============================================================
   4. SQL 注入预检测（轻量级）
   ============================================================ */
const SQL_INJECTION_PATTERNS = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script)\b/i,
    /\b(waitfor\s+delay|sleep\s*\()\b/i,
    /\b(into\s+outfile|load_file\s*\()\b/i,
];
const SAFE_KEYS = ['page', 'pageSize', 'sort', 'order', 'timestamp'];
function containsSqlInjection(value) {
    if (typeof value !== 'string')
        return false;
    const lower = value.toLowerCase();
    // 排除纯数字和时间戳
    if (/^\d+$/.test(value))
        return false;
    return SQL_INJECTION_PATTERNS.some((p) => p.test(lower));
}
function sqlInjectionPreCheck() {
    return (req, res, next) => {
        const checkTarget = { ...req.query, ...req.body, ...req.params };
        for (const [key, value] of Object.entries(checkTarget)) {
            if (SAFE_KEYS.includes(key))
                continue;
            if (containsSqlInjection(value)) {
                logger_1.default.warn(`[Security] SQL injection attempt detected from ${req.ip} on ${req.path}: ${key}=${String(value).slice(0, 100)}`);
                res.status(400).json((0, response_1.fail)('请求包含非法字符', 400, req.reqId));
                return;
            }
        }
        next();
    };
}
//# sourceMappingURL=security.middleware.js.map