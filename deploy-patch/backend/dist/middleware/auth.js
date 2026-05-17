"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jwt_1 = require("@/utils/jwt");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const redis_1 = __importDefault(require("@/config/redis"));
const AUTH_CACHE_TTL = 300; // 5 分钟
async function authMiddleware(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token)
            return res.status(401).json((0, response_1.fail)('未登录，请先登录', 401, req.reqId));
        const decoded = (0, jwt_1.verifyToken)(token);
        // 尝试从 Redis 缓存读取权限（减少每次请求都查库）
        const cacheKey = `auth:perms:${decoded.userId}`;
        let cached = null;
        try {
            cached = await redis_1.default.get(cacheKey);
        }
        catch { /* Redis 不可用则降级查库 */ }
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                req.user = {
                    userId: decoded.userId,
                    username: decoded.username,
                    roles: parsed.roles || [],
                    permissions: parsed.permissions || [],
                };
                return next();
            }
            catch { /* 缓存损坏则继续查库 */ }
        }
        const user = await models_1.User.findByPk(decoded.userId, {
            include: [{ model: models_1.Role, include: [models_1.Permission] }]
        });
        if (!user || user.status === 0)
            return res.status(401).json((0, response_1.fail)('用户不存在或已被禁用', 401, req.reqId));
        const roles = user.roles?.map((r) => r.role_code) || [];
        const permissions = new Set();
        user.roles?.forEach((r) => {
            r.permissions?.forEach((p) => permissions.add(p.perm_code));
        });
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            roles,
            permissions: Array.from(permissions),
        };
        // 写入 Redis 缓存
        try {
            await redis_1.default.setex(cacheKey, AUTH_CACHE_TTL, JSON.stringify({ roles, permissions: Array.from(permissions) }));
        }
        catch { /* 忽略 Redis 写入失败 */ }
        next();
    }
    catch (err) {
        return res.status(401).json((0, response_1.fail)('登录已过期，请重新登录', 401, req.reqId));
    }
}
//# sourceMappingURL=auth.js.map