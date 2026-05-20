/**
 * ═══════════════════════════════════════════════════════════════════
 * Redis 缓存工具 — 为热点查询提供透明缓存层
 * ═══════════════════════════════════════════════════════════════════
 */
import redis from '@/config/redis';
import logger from '@/config/logger';

interface CacheOptions {
  ttl?: number;        // 缓存时间（秒），默认 60
  key?: string;        // 自定义缓存键
  tag?: string;        // 缓存标签，用于批量失效
  skipCache?: boolean; // 强制跳过缓存
}

const DEFAULT_TTL = 60;

/** 生成缓存键 */
function buildCacheKey(tag: string, key: string): string {
  return `cache:${tag}:${key}`;
}

/** 读取缓存 */
export async function cacheGet<T>(tag: string, key: string): Promise<T | null> {
  try {
    const data = await redis.get(buildCacheKey(tag, key));
    if (data) {
      return JSON.parse(data) as T;
    }
  } catch (err: any) {
    logger.warn(`[Cache] 读取失败: ${err.message}`);
  }
  return null;
}

/** 写入缓存 */
export async function cacheSet<T>(tag: string, key: string, value: T, ttl = DEFAULT_TTL): Promise<void> {
  try {
    await redis.setex(buildCacheKey(tag, key), ttl, JSON.stringify(value));
  } catch (err: any) {
    logger.warn(`[Cache] 写入失败: ${err.message}`);
  }
}

/** 删除缓存 */
export async function cacheDel(tag: string, key: string): Promise<void> {
  try {
    await redis.del(buildCacheKey(tag, key));
  } catch (err: any) {
    logger.warn(`[Cache] 删除失败: ${err.message}`);
  }
}

/** 按标签批量删除缓存 */
export async function cacheDelByPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(`cache:${pattern}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err: any) {
    logger.warn(`[Cache] 批量删除失败: ${err.message}`);
  }
}

/** 缓存包装器 — 自动读写缓存 */
export async function withCache<T>(
  tag: string,
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, skipCache = false } = options;

  if (!skipCache) {
    const cached = await cacheGet<T>(tag, key);
    if (cached !== null) {
      return cached;
    }
  }

  const result = await fn();
  await cacheSet(tag, key, result, ttl);
  return result;
}

/** 仪表盘统计专用缓存标签 */
export const CacheTags = {
  DASHBOARD: 'dashboard',
  UNIT_STATS: 'unit_stats',
  DEVICE_STATS: 'device_stats',
  ALARM_STATS: 'alarm_stats',
  SYSTEM_CONFIG: 'system_config',
  IOT_PROTOCOL: 'iot_protocol',
} as const;
