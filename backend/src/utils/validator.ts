import { fail } from './response';
import type { Response } from 'express';

/** 严格解析正整数 ID，失败时抛出 Error（供 Controller try/catch 捕获） */
export function parseIdStrict(id: string): number {
  const n = parseInt(id, 10);
  if (isNaN(n) || n <= 0) throw new Error('无效ID');
  return n;
}

/** 安全过滤请求体：排除 id 字段，防止非法修改主键 */
export function sanitizeBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const b = body as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(b)) {
    if (key !== 'id') result[key] = b[key];
  }
  return result;
}

/** 最大分页条数，防止恶意大分页导致 OOM */
export const MAX_PAGE_SIZE = 500;

/** 安全提取分页参数 */
export function sanitizePagination(req: { query: Record<string, unknown> }) {
  const rawPageNum = parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10);
  const rawPageSize = parseInt(String(req.query.pageSize ?? req.query.size ?? 10), 10);
  return {
    pageNum: Math.max(1, Number.isFinite(rawPageNum) ? rawPageNum : 1),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isFinite(rawPageSize) ? rawPageSize : 10)),
  };
}

/** 安全提取 ID（支持数字主键和字符串标识） */
export function sanitizeId(idParam: string, res: Response): number | string | null {
  const trimmed = String(idParam ?? '').trim();
  if (!trimmed) {
    res.status(400).json(fail('缺少 ID 参数', 400));
    return null;
  }
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    if (n > 0) return n;
  }
  // 非纯数字则返回原字符串（如 device_sn）
  return trimmed;
}

/** 安全提取数字 ID（纯数字场景） */
export function sanitizeNumericId(idParam: string, res: Response): number | null {
  const trimmed = String(idParam ?? '').trim();
  if (!trimmed) {
    res.status(400).json(fail('缺少 ID 参数', 400));
    return null;
  }
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) {
    res.status(400).json(fail('无效的 ID 参数', 400));
    return null;
  }
  return n;
}

/** 字段白名单过滤（防止非法字段注入） */
export function pickBody<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  allowedFields: string[],
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) result[key] = body[key];
  }
  return result as Partial<T>;
}

/** 安全提取整数查询参数 */
export function sanitizeInt(
  value: unknown,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const n = parseInt(String(value ?? defaultValue), 10);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, n));
}

/** 安全提取天数参数（用于统计报表） */
export function sanitizeDays(req: { query: Record<string, unknown> }, defaultDays = 30): number {
  return sanitizeInt(req.query.days, defaultDays, 1, 365);
}
