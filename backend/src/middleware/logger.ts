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

const SENSITIVE_KEYS = ['password', 'newPassword', 'oldPassword', 'token', 'secret', 'apiKey', 'api_key', 'jwt', 'authorization', 'auth'];

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized: any = Array.isArray(body) ? [...body] : { ...body };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeBody(sanitized[key]);
    }
  }
  return sanitized;
}

export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error(`${req.method} ${req.path} - ${err.message}`, {
    stack: err.stack, body: sanitizeBody(req.body), query: req.query, params: req.params,
    ip: req.ip, reqId: req.reqId, userId: (req as { user?: { userId?: number } }).user?.userId,
  });
  next(err);
}
