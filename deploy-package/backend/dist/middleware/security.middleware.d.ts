/**
 * security.middleware.ts — 安全加固中间件
 *
 * 1. 安全响应头（CSP / HSTS / X-Frame-Options 等）
 * 2. 基于 Redis 的 IP + 用户级限流
 * 3. 敏感数据响应脱敏
 * 4. SQL 注入预检测
 */
import { Request, Response, NextFunction } from 'express';
export declare function securityHeaders(): (_req: Request, res: Response, next: NextFunction) => void;
interface RateLimitStore {
    get(key: string): Promise<string | null>;
    setex(key: string, seconds: number, value: string): Promise<void>;
}
export declare function setRateLimitRedis(client: RateLimitStore): void;
interface RateLimitOptions {
    windowMs: number;
    max: number;
    keyPrefix?: string;
    message?: string;
    skipSuccessfulRequests?: boolean;
}
export declare function rateLimitByIP(opts: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function rateLimitByUser(opts: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function sensitiveDataFilter(): (_req: Request, res: Response, next: NextFunction) => void;
export declare function sqlInjectionPreCheck(): (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=security.middleware.d.ts.map