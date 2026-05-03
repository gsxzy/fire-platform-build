/**
 * ═══════════════════════════════════════════════════════════════════
 * 类型桥接层 - 新旧类型格式转换工具
 * 
 * 旧体系: snake_case + number ID + 枚举值用 number
 * 新体系: camelCase + string ID + 枚举值用 string literal
 * 
 * 用法：在 API 兼容层或数据迁移脚本中使用，逐步淘汰旧格式
 * ═══════════════════════════════════════════════════════════════════
 */

/* ───── 通用键名转换 ───── */

/** snake_case → camelCase */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/** camelCase → snake_case */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/** 递归转换对象的所有键：snake_case → camelCase */
export function keysToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamel) as unknown as T;
  if (typeof obj !== 'object') return obj;
  const result: any = {};
  Object.entries(obj).forEach(([key, value]) => {
    const camelKey = snakeToCamel(key);
    result[camelKey] = keysToCamel(value);
  });
  return result as T;
}

/** 递归转换对象的所有键：camelCase → snake_case */
export function keysToSnake<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToSnake) as unknown as T;
  if (typeof obj !== 'object') return obj;
  const result: any = {};
  Object.entries(obj).forEach(([key, value]) => {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = keysToSnake(value);
  });
  return result as T;
}

/* ───── 分页包装器转换 ───── */

interface OldPageResult<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}

interface NewPageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 旧分页格式 → 新分页格式 */
export function pageResultToNew<T>(old: OldPageResult<T>): NewPageResult<T> {
  return {
    list: old.list,
    total: old.total,
    page: old.pageNum ?? 1,
    pageSize: old.pageSize ?? 10,
    totalPages: Math.ceil(old.total / (old.pageSize || 10)),
  };
}

/** 新分页格式 → 旧分页格式 */
export function pageResultToOld<T>(neo: NewPageResult<T>): OldPageResult<T> {
  return {
    list: neo.list,
    total: neo.total,
    pageNum: neo.page ?? 1,
    pageSize: neo.pageSize ?? 10,
  };
}

/* ───── 风险等级转换 ───── */

/** 旧 risk_level (number 1-4) → 新 riskLevel (string) */
export function riskLevelToNew(old: number): string {
  const map: Record<number, string> = { 1: 'low', 2: 'medium', 3: 'high', 4: 'extreme' };
  return map[old] ?? 'low';
}

/** 新 riskLevel (string) → 旧 risk_level (number) */
export function riskLevelToOld(neo: string): number {
  const map: Record<string, number> = { low: 1, medium: 2, high: 3, extreme: 4 };
  return map[neo] ?? 1;
}

/* ───── 告警级别转换 ───── */

/** 旧 alarm_level (number 1-4) → 新 level (string) */
export function alarmLevelToNew(old: number): string {
  const map: Record<number, string> = { 1: 'low', 2: 'normal', 3: 'high', 4: 'urgent' };
  return map[old] ?? 'normal';
}

/** 新 level (string) → 旧 alarm_level (number) */
export function alarmLevelToOld(neo: string): number {
  const map: Record<string, number> = { low: 1, normal: 2, high: 3, urgent: 4 };
  return map[neo] ?? 2;
}

/* ───── 告警类型转换 ───── */

/** 旧 alarm_type (number) → 新 type (string) */
export function alarmTypeToNew(old: number): string {
  const map: Record<number, string> = { 1: 'fire', 2: 'fault', 3: 'warning', 4: 'supervisory' };
  return map[old] ?? 'warning';
}

/** 新 type (string) → 旧 alarm_type (number) */
export function alarmTypeToOld(neo: string): number {
  const map: Record<string, number> = { fire: 1, fault: 2, warning: 3, supervisory: 4 };
  return map[neo] ?? 3;
}

/* ───── 告警状态转换 ───── */

/** 旧 status (number 0-3) → 新 status (string) */
export function alarmStatusToNew(old: number): string {
  const map: Record<number, string> = { 0: 'new', 1: 'confirmed', 2: 'handled', 3: 'ignored' };
  return map[old] ?? 'new';
}

/** 新 status (string) → 旧 status (number) */
export function alarmStatusToOld(neo: string): number {
  const map: Record<string, number> = { new: 0, confirmed: 1, handled: 2, ignored: 3 };
  return map[neo] ?? 0;
}

/* ───── 设备状态转换 ───── */

/** 旧 status (number 1-3) → 新 status (string) */
export function deviceStatusToNew(old: number): string {
  const map: Record<number, string> = { 1: 'normal', 2: 'fault', 3: 'offline' };
  return map[old] ?? 'normal';
}

/** 新 status (string) → 旧 status (number) */
export function deviceStatusToOld(neo: string): number {
  const map: Record<string, number> = { normal: 1, fault: 2, offline: 3 };
  return map[neo] ?? 1;
}

/* ───── ID 转换 ───── */

/** number ID → string ID（带前缀） */
export function idToString(id: number, prefix: string): string {
  return `${prefix}-${String(id).padStart(3, '0')}`;
}

/** string ID → number ID */
export function idToNumber(id: string): number {
  const num = parseInt(id.replace(/^.*-/, ''), 10);
  return isNaN(num) ? 0 : num;
}

/* ───── 批量转换辅助 ───── */

/** 对列表中的每个元素应用转换函数 */
export function mapList<T, R>(list: T[], converter: (item: T) => R): R[] {
  return list.map(converter);
}

/** 对分页结果中的 list 应用转换函数 */
export function mapPageResult<T, R>(page: { list: T[]; total: number }, converter: (item: T) => R): { list: R[]; total: number } {
  return {
    list: page.list.map(converter),
    total: page.total,
  };
}
