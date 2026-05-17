/**
 * ═══════════════════════════════════════════════════════════════════
 * 请求追踪中间件
 * 注入 reqId、计算耗时、添加响应头
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';
export declare function requestTracer(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=requestTracer.d.ts.map