/**
 * ═══════════════════════════════════════════════════════════════════
 * 内存版速率限制中间件（零依赖）
 * 移植自旧版 JS 后端
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';
export interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    keyGenerator?: (req: Request) => string;
    message?: string;
}
export declare function rateLimit(options?: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => void;
export declare const globalRateLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const authRateLimiter: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rateLimit.d.ts.map