

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

// 如需从请求自动携带 requestId，请使用 success(data, msg, req.reqId) 或 fail(msg, code, req.reqId)
