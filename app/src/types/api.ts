/**
 * HTTP 客户端与后端 JSON 信封的共享约定（与 backend/utils/response.ts 对齐）
 */
export type { ApiResponse, PaginatedData, QueryParams } from '@/types/db';

/** 后端/网关可能返回 message、msg 之一或并存 */
export type ApiEnvelopeFields = {
  message?: string;
  msg?: string;
};

export function getApiEnvelopeMessage(body: ApiEnvelopeFields | null | undefined, fallback = '请求失败'): string {
  if (!body) return fallback;
  const m = body.message ?? body.msg;
  return typeof m === 'string' && m.trim().length > 0 ? m.trim() : fallback;
}

/** 业务或 HTTP 层失败时抛出，便于统一 toast / 日志（instanceof 判断） */
export class ApiClientError extends Error {
  readonly code: number;
  readonly httpStatus?: number;

  constructor(message: string, code: number, httpStatus?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.httpStatus = httpStatus;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

export function isApiClientError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError;
}

/** 从 catch 块安全取文案（支持 ApiClientError、Error、字符串） */
export function getErrorMessage(err: unknown, fallback = '操作失败'): string {
  if (isApiClientError(err)) return err.message;
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  if (typeof err === 'string' && err.trim()) return err.trim();
  return fallback;
}
