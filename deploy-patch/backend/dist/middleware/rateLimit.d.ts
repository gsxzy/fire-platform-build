/**
 * ═══════════════════════════════════════════════════════════════════
 * Redis 版速率限制中间件（支持多实例部署）
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';
export interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    keyGenerator?: (req: Request) => string;
    message?: string;
    /** 是否使用 Redis（默认 true，Redis 不可用时降级为内存） */
    useRedis?: boolean;
}
export declare function rateLimit(options?: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** 全局默认限制: 600/分钟 */
export declare const globalRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** 认证接口限制: 10/15分钟 */
export declare const authRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** IoT 公共上报接口限制: 120/分钟 */
export declare const iotRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** IoT 心跳接口限制: 60/分钟 */
export declare const iotHeartbeatLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** 已认证用户通用限制: 300/分钟（按用户ID，防止刷接口） */
export declare const userRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** 导出/下载限制: 20/分钟（防止大查询拖垮数据库） */
export declare const exportRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** 批量操作限制: 10/分钟（批量删除/导入等） */
export declare const batchRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rateLimit.d.ts.map