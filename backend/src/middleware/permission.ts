import type { Request, Response, NextFunction } from 'express';
import { fail } from '@/utils/response';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/**
 * 校验当前用户是否具备任一权限码；超级管理员角色直接放行
 */
export function requirePermission(...permCodes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(fail('未登录，请先登录', 401, req.reqId));
    }

    const roles = req.user.roles ?? [];
    if (roles.some((r) => ADMIN_ROLES.has(r))) {
      return next();
    }

    const permissions = req.user.permissions ?? [];
    if (permissions.length === 0) {
      if (process.env.PERMISSION_STRICT === '1') {
        return res.status(403).json(fail('无操作权限', 403, req.reqId));
      }
      return next();
    }

    const ok = permCodes.some((code) => permissions.includes(code));
    if (!ok) {
      return res.status(403).json(fail('无操作权限', 403, req.reqId));
    }
    return next();
  };
}
