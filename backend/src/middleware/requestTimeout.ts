/**
 * ═══════════════════════════════════════════════════════════════════
 * 请求超时保护中间件
 * 防止单请求长时间占用线程，保护服务可用性
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';
import logger from '@/config/logger';

const DEFAULT_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);

export function requestTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`[RequestTimeout] 请求超时: ${req.method} ${req.path} (${timeoutMs}ms)`);
        res.status(504).json({
          code: 504,
          message: '请求处理超时，请稍后重试',
          timestamp: Date.now(),
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}
