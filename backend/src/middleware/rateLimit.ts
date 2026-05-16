/**
 * ═══════════════════════════════════════════════════════════════════
 * 内存版速率限制中间件（零依赖）
 * 移植自旧版 JS 后端
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';
import logger from '@/config/logger';
import { fail } from '@/utils/response';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitRecord>();
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) store.delete(key);
  }
}
setInterval(cleanup, CLEANUP_INTERVAL_MS);

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 1000;
  const keyGenerator = options.keyGenerator || ((req: Request) => `${req.ip}:${req.path}`);
  const message = options.message || '请求过于频繁，请稍后再试';

  return (req: Request, res: Response, next: NextFunction) => {
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
      logger.warn(`[RateLimit] 限流触发: ${key} (${record.count}/${max})`);
      res.status(429).json(fail(message, 429, req.reqId));
      return;
    }

    next();
  };
}

/* 全局默认限制: 600/分钟 */
export const globalRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 600 });

/* 认证接口限制: 10/15分钟 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `auth:${req.ip}`,
  message: '登录尝试次数过多，请15分钟后再试',
});
