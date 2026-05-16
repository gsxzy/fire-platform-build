/**
 * ═══════════════════════════════════════════════════════════════════
 * 慢请求警告中间件
 * 超过阈值时记录 WARN 日志
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';
import logger from '@/config/logger';

const SLOW_THRESHOLD_MS = 1000;

export function slowRequestWarning(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > SLOW_THRESHOLD_MS) {
      logger.warn(`[SlowRequest] ${req.method} ${req.originalUrl} 耗时 ${duration}ms`, {
        method: req.method, path: req.originalUrl, duration,
        ip: req.ip, userId: (req as any).user?.userId,
      });
    }
  });
  next();
}
