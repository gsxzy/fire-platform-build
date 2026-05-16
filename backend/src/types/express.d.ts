/**
 * Express Request 扩展（与 requestTracer 等中间件对齐）
 */
export {};

declare global {
  namespace Express {
    interface Request {
      /** 由 requestTracer 注入，用于日志与 JSON 信封 requestId */
      reqId: string;
    }
  }
}
