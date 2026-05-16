"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAGE_SIZE = void 0;
exports.sanitizePagination = sanitizePagination;
exports.sanitizeId = sanitizeId;
exports.sanitizeNumericId = sanitizeNumericId;
exports.pickBody = pickBody;
exports.sanitizeInt = sanitizeInt;
exports.sanitizeDays = sanitizeDays;
const response_1 = require("./response");
/** 最大分页条数，防止恶意大分页导致 OOM */
exports.MAX_PAGE_SIZE = 500;
/** 安全提取分页参数 */
function sanitizePagination(req) {
    const rawPageNum = parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10);
    const rawPageSize = parseInt(String(req.query.pageSize ?? req.query.size ?? 10), 10);
    return {
        pageNum: Math.max(1, Number.isFinite(rawPageNum) ? rawPageNum : 1),
        pageSize: Math.min(exports.MAX_PAGE_SIZE, Math.max(1, Number.isFinite(rawPageSize) ? rawPageSize : 10)),
    };
}
/** 安全提取 ID（支持数字主键和字符串标识） */
function sanitizeId(idParam, res) {
    const trimmed = String(idParam ?? '').trim();
    if (!trimmed) {
        res.status(400).json((0, response_1.fail)('缺少 ID 参数', 400));
        return null;
    }
    if (/^\d+$/.test(trimmed)) {
        const n = parseInt(trimmed, 10);
        if (n > 0)
            return n;
    }
    // 非纯数字则返回原字符串（如 device_sn）
    return trimmed;
}
/** 安全提取数字 ID（纯数字场景） */
function sanitizeNumericId(idParam, res) {
    const trimmed = String(idParam ?? '').trim();
    if (!trimmed) {
        res.status(400).json((0, response_1.fail)('缺少 ID 参数', 400));
        return null;
    }
    const n = parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n <= 0) {
        res.status(400).json((0, response_1.fail)('无效的 ID 参数', 400));
        return null;
    }
    return n;
}
/** 字段白名单过滤（防止非法字段注入） */
function pickBody(body, allowedFields) {
    const result = {};
    for (const key of allowedFields) {
        if (key in body)
            result[key] = body[key];
    }
    return result;
}
/** 安全提取整数查询参数 */
function sanitizeInt(value, defaultValue, min, max) {
    const n = parseInt(String(value ?? defaultValue), 10);
    if (!Number.isFinite(n))
        return defaultValue;
    return Math.min(max, Math.max(min, n));
}
/** 安全提取天数参数（用于统计报表） */
function sanitizeDays(req, defaultDays = 30) {
    return sanitizeInt(req.query.days, defaultDays, 1, 365);
}
//# sourceMappingURL=validator.js.map