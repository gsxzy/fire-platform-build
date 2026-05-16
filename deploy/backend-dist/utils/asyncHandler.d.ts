import type { RequestHandler } from 'express';
/**
 * 包装 async 路由处理器，将 Promise 拒绝转发到 Express 错误管道
 * 新路由优先使用本工具，避免每个方法手写 try/catch
 */
export declare function asyncHandler(fn: (...args: Parameters<RequestHandler>) => Promise<unknown>): RequestHandler;
//# sourceMappingURL=asyncHandler.d.ts.map