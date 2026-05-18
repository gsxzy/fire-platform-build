import type { Request, Response } from 'express';

/** 与前端 ApiResponse / getApiEnvelopeMessage 对齐的 JSON 信封 */
export interface ApiJsonEnvelope<T = unknown> {
  code: number;
  msg: string;
  /** 与 msg 同义，兼容只读 message 的前端类型 */
  message: string;
  data: T | null;
  timestamp: number;
  requestId?: string;
}

function buildEnvelope<T>(p: {
  code: number;
  msg: string;
  data: T | null;
  requestId?: string;
}): ApiJsonEnvelope<T> {
  const env: ApiJsonEnvelope<T> = {
    code: p.code,
    msg: p.msg,
    message: p.msg,
    data: p.data,
    timestamp: Date.now(),
  };
  if (p.requestId) env.requestId = p.requestId;
  return env;
}

export const success = <T = unknown>(data: T, msg = '操作成功', requestId?: string) =>
  buildEnvelope<T>({ code: 200, msg, data, requestId });

export const fail = (msg = '操作失败', code = 400, requestId?: string) =>
  buildEnvelope({ code, msg, data: null, requestId });

export const page = (list: unknown[], total: number, pageNum: number, pageSize: number, requestId?: string) =>
  buildEnvelope({
    code: 200,
    msg: '查询成功',
    data: { list, total, pageNum, pageSize, pages: Math.ceil(total / pageSize) },
    requestId,
  });

/* ═══════════════════════════════════════════════════════════
   控制器统一响应 — 自动携带 requestId
   ═══════════════════════════════════════════════════════════ */

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
