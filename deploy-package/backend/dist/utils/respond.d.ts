import type { Request, Response } from 'express';
/**
 * 控制器统一响应 — 自动携带 requestId，与前端 ApiResponse 对齐
 */
export declare function sendSuccess<T>(res: Response, req: Request, data: T, msg?: string): Response<any, Record<string, any>>;
export declare function sendFail(res: Response, req: Request, msg: string, code?: number): Response<any, Record<string, any>>;
export declare function sendPage(res: Response, req: Request, list: unknown[], total: number, pageNum: number, pageSize: number, msg?: string): Response<any, Record<string, any>>;
//# sourceMappingURL=respond.d.ts.map