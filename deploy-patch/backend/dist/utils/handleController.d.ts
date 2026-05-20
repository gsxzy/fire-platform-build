import type { Request, Response, RequestHandler } from 'express';
type ControllerFn = (req: Request, res: Response) => Promise<unknown> | void;
/**
 * 包装控制器：统一捕获异常并输出标准信封（配合 sendSuccess / sendFail）
 */
export declare function handleController(label: string, fn: ControllerFn): RequestHandler;
export {};
//# sourceMappingURL=handleController.d.ts.map