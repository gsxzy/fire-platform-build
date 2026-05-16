import type { Request, Response, NextFunction } from 'express';
import logger from '@/config/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      method: req.method, path: req.path, status: res.statusCode, duration,
      ip: req.ip, userAgent: req.get('user-agent'), reqId: req.reqId,
      userId: (req as { user?: { userId?: number } }).user?.userId,
    });
  });
  next();
}

export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error(`${req.method} ${req.path} - ${err.message}`, {
    stack: err.stack, body: req.body, query: req.query, params: req.params,
    ip: req.ip, reqId: req.reqId, userId: (req as { user?: { userId?: number } }).user?.userId,
  });
  next(err);
}
