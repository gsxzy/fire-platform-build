import type { Response } from 'express';
/** 最大分页条数，防止恶意大分页导致 OOM */
export declare const MAX_PAGE_SIZE = 500;
/** 安全提取分页参数 */
export declare function sanitizePagination(req: {
    query: Record<string, unknown>;
}): {
    pageNum: number;
    pageSize: number;
};
/** 安全提取 ID（支持数字主键和字符串标识） */
export declare function sanitizeId(idParam: string, res: Response): number | string | null;
/** 安全提取数字 ID（纯数字场景） */
export declare function sanitizeNumericId(idParam: string, res: Response): number | null;
/** 字段白名单过滤（防止非法字段注入） */
export declare function pickBody<T extends Record<string, unknown>>(body: Record<string, unknown>, allowedFields: string[]): Partial<T>;
/** 安全提取整数查询参数 */
export declare function sanitizeInt(value: unknown, defaultValue: number, min: number, max: number): number;
/** 安全提取天数参数（用于统计报表） */
export declare function sanitizeDays(req: {
    query: Record<string, unknown>;
}, defaultDays?: number): number;
//# sourceMappingURL=validator.d.ts.map