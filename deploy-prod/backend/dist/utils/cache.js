"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheTags = void 0;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
exports.cacheDelByPattern = cacheDelByPattern;
exports.withCache = withCache;
/**
 * ═══════════════════════════════════════════════════════════════════
 * Redis 缓存工具 — 为热点查询提供透明缓存层
 * ═══════════════════════════════════════════════════════════════════
 */
const redis_1 = __importDefault(require("@/config/redis"));
const logger_1 = __importDefault(require("@/config/logger"));
const DEFAULT_TTL = 60;
/** 生成缓存键 */
function buildCacheKey(tag, key) {
    return `cache:${tag}:${key}`;
}
/** 读取缓存 */
async function cacheGet(tag, key) {
    try {
        const data = await redis_1.default.get(buildCacheKey(tag, key));
        if (data) {
            return JSON.parse(data);
        }
    }
    catch (err) {
        logger_1.default.warn(`[Cache] 读取失败: ${err.message}`);
    }
    return null;
}
/** 写入缓存 */
async function cacheSet(tag, key, value, ttl = DEFAULT_TTL) {
    try {
        await redis_1.default.setex(buildCacheKey(tag, key), ttl, JSON.stringify(value));
    }
    catch (err) {
        logger_1.default.warn(`[Cache] 写入失败: ${err.message}`);
    }
}
/** 删除缓存 */
async function cacheDel(tag, key) {
    try {
        await redis_1.default.del(buildCacheKey(tag, key));
    }
    catch (err) {
        logger_1.default.warn(`[Cache] 删除失败: ${err.message}`);
    }
}
/** 按标签批量删除缓存 */
async function cacheDelByPattern(pattern) {
    try {
        const keys = await redis_1.default.keys(`cache:${pattern}:*`);
        if (keys.length > 0) {
            await redis_1.default.del(...keys);
        }
    }
    catch (err) {
        logger_1.default.warn(`[Cache] 批量删除失败: ${err.message}`);
    }
}
/** 缓存包装器 — 自动读写缓存 */
async function withCache(tag, key, fn, options = {}) {
    const { ttl = DEFAULT_TTL, skipCache = false } = options;
    if (!skipCache) {
        const cached = await cacheGet(tag, key);
        if (cached !== null) {
            return cached;
        }
    }
    const result = await fn();
    await cacheSet(tag, key, result, ttl);
    return result;
}
/** 仪表盘统计专用缓存标签 */
exports.CacheTags = {
    DASHBOARD: 'dashboard',
    UNIT_STATS: 'unit_stats',
    DEVICE_STATS: 'device_stats',
    ALARM_STATS: 'alarm_stats',
    SYSTEM_CONFIG: 'system_config',
    IOT_PROTOCOL: 'iot_protocol',
};
//# sourceMappingURL=cache.js.map