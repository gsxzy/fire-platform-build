"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jwt_1 = require("@/utils/jwt");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
async function authMiddleware(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token)
            return res.status(401).json((0, response_1.fail)('未登录，请先登录', 401, req.reqId));
        const decoded = (0, jwt_1.verifyToken)(token);
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
        next();
    }
    catch (err) {
        return res.status(401).json((0, response_1.fail)('登录已过期，请重新登录', 401, req.reqId));
    }
}
//# sourceMappingURL=auth.js.map