import type { Request, Response } from 'express';
import { success, fail, page } from '@/utils/response';

/**
 * 控制器统一响应 — 自动携带 requestId，与前端 ApiResponse 对齐
 */
export function sendSuccess<T>(res: Response, req: Request, data: T, msg = '操作成功') {
  return res.json(success(data, msg, req.reqId));
}

export function sendFail(res: Response, req: Request, msg: string, code = 400) {
  return res.status(code >= 400 ? code : 400).json(fail(msg, code, req.reqId));
}

export function sendPage(
  res: Response,
  req: Request,
  list: unknown[],
  total: number,
  pageNum: number,
  pageSize: number,
  msg = '查询成功'
) {
  return res.json(page(list, total, pageNum, pageSize, req.reqId));
}
