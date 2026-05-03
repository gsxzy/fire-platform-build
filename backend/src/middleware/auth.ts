import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { fail } from '@/utils/response';
import { User, Role, Permission } from '@/models';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; username: string; roles: string[]; permissions: string[] };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json(fail('未登录，请先登录', 401));

    const decoded = verifyToken(token) as { userId: number; username: string };
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, include: [Permission] }]
    });
    if (!user || (user as any).status === 0) return res.status(401).json(fail('用户不存在或已被禁用', 401));

    const roles = (user as any).roles?.map((r: any) => r.role_code) || [];
    const permissions = new Set<string>();
    (user as any).roles?.forEach((r: any) => {
      r.permissions?.forEach((p: any) => permissions.add(p.perm_code));
    });

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      roles,
      permissions: Array.from(permissions),
    };
    next();
  } catch (err) {
    return res.status(401).json(fail('登录已过期，请重新登录', 401));
  }
}

export function requirePermission(...codes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json(fail('未登录', 401));
    if (req.user.roles.includes('admin')) return next();
    const hasPerm = codes.some(c => req.user!.permissions.includes(c));
    if (!hasPerm) return res.status(403).json(fail('无权操作', 403));
    next();
  };
}
