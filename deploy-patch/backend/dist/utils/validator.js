"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAGE_SIZE = void 0;
exports.parseIdStrict = parseIdStrict;
exports.sanitizeBody = sanitizeBody;
exports.sanitizePagination = sanitizePagination;
exports.pickBody = pickBody;
exports.sanitizeInt = sanitizeInt;
exports.sanitizeDays = sanitizeDays;
exports.truncateString = truncateString;
exports.hasSqlInjection = hasSqlInjection;
exports.sanitizeFilename = sanitizeFilename;
/** 严格解析正整数 ID，失败时抛出 Error（供 Controller try/catch 捕获） */
function parseIdStrict(id) {
    const n = parseInt(id, 10);
    if (isNaN(n) || n <= 0)
        throw new Error('无效ID');
    return n;
}
/** 安全过滤请求体：排除 id 字段，防止非法修改主键 */
function sanitizeBody(body) {
    if (!body || typeof body !== 'object')
        return {};
    const b = body;
    const result = {};
    for (const key of Object.keys(b)) {
        if (key !== 'id')
            result[key] = b[key];
    }
    return result;
}
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
/** 字符串长度截断（防止超大数据注入） */
function truncateString(value, maxLength) {
    const str = value == null ? '' : String(value);
    return str.length > maxLength ? str.slice(0, maxLength) : str;
}
/** 基础 SQL 注入检测（敏感字符检查） */
function hasSqlInjection(value) {
    if (value == null)
        return false;
    const str = String(value);
    // 检测常见的 SQL 注入模式
    const patterns = [
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
        /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
        /((\%27)|(\'))union/i,
        /exec(\s|\+)+(s|x)p\w+/i,
        /UNION\s+SELECT/i,
        /INSERT\s+INTO/i,
        /DELETE\s+FROM/i,
        /DROP\s+TABLE/i,
    ];
    return patterns.some(p => p.test(str));
}
/** 安全文件名（去除路径穿越和非法字符） */
function sanitizeFilename(name) {
    return name
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/^(\.\.*\/)+/g, '')
        .replace(/\.{2,}/g, '.')
        .slice(0, 255);
}
//# sourceMappingURL=validator.js.map