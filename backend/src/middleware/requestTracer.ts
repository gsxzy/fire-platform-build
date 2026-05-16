/**
 * ═══════════════════════════════════════════════════════════════════
 * 请求追踪中间件
 * 注入 reqId、计算耗时、添加响应头
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';

let reqIdCounter = 0;

export function requestTracer(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const reqId = `${Date.now().toString(36)}-${(++reqIdCounter).toString(36)}`;
  req.reqId = reqId;

  res.setHeader('X-Request-Id', reqId);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  res.on('finish', () => {
    const duration = Date.now() - start;
    // 响应已发送，不能再设置 header，仅用于内部追踪
    (res as any)._responseTime = duration;
  });

  next();
}
