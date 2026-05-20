/**
 * ═══════════════════════════════════════════════════════════════════
 * 请求超时保护中间件
 * 防止单请求长时间占用线程，保护服务可用性
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';
export declare function requestTimeout(timeoutMs?: number): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestTimeout.d.ts.map