"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
const response_1 = require("@/utils/response");
const ADMIN_ROLES = new Set(['admin', 'super_admin']);
/**
 * 校验当前用户是否具备任一权限码；超级管理员角色直接放行
 */
function requirePermission(...permCodes) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json((0, response_1.fail)('未登录，请先登录', 401, req.reqId));
        }
        const roles = req.user.roles ?? [];
        if (roles.some((r) => ADMIN_ROLES.has(r))) {
            return next();
        }
        const permissions = req.user.permissions ?? [];
        if (permissions.length === 0) {
            if (process.env.PERMISSION_STRICT === '1') {
                return res.status(403).json((0, response_1.fail)('无操作权限', 403, req.reqId));
            }
            return next();
        }
        const ok = permCodes.some((code) => permissions.includes(code));
        if (!ok) {
            return res.status(403).json((0, response_1.fail)('无操作权限', 403, req.reqId));
        }
        return next();
    };
}
//# sourceMappingURL=permission.js.map