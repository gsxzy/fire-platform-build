/**
 * ═══════════════════════════════════════════════════════════════════
 * 慢请求警告中间件
 * 超过阈值时记录 WARN 日志
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';
export declare function slowRequestWarning(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=slowRequest.d.ts.map