import type { Request, Response, RequestHandler } from 'express';
import logger from '@/config/logger';
import { HttpError } from '@/utils/httpError';
import { sendFail } from '@/utils/response';

type ControllerFn = (req: Request, res: Response) => Promise<unknown> | void;

/**
 * 包装控制器：统一捕获异常并输出标准信封（配合 sendSuccess / sendFail）
 */
export function handleController(label: string, fn: ControllerFn): RequestHandler {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err: unknown) {
      const e = err as { message?: string; httpStatus?: number; businessCode?: number };
      logger.error(`[${label}] ${e?.message || err}`);
      if (err instanceof HttpError) {
        return sendFail(res, req, err.message, err.httpStatus);
      }
      return sendFail(res, req, e?.message || '服务器内部错误', e?.businessCode ?? 500);
    }
  };
}
