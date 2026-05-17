import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { fail } from '@/utils/response';
import { User, Role, Permission } from '@/models';
import redis from '@/config/redis';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; username: string; roles: string[]; permissions: string[] };
    }
  }
}

const AUTH_CACHE_TTL = 300; // 5 分钟

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json(fail('未登录，请先登录', 401, req.reqId));

    const decoded = verifyToken(token) as { userId: number; username: string };

    // 尝试从 Redis 缓存读取权限（减少每次请求都查库）
    const cacheKey = `auth:perms:${decoded.userId}`;
    let cached: string | null = null;
    try {
      cached = await redis.get(cacheKey);
    } catch { /* Redis 不可用则降级查库 */ }

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
      } catch { /* 缓存损坏则继续查库 */ }
    }

    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, include: [Permission] }]
    });
    if (!user || (user as any).status === 0) return res.status(401).json(fail('用户不存在或已被禁用', 401, req.reqId));

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

    // 写入 Redis 缓存
    try {
      await redis.setex(cacheKey, AUTH_CACHE_TTL, JSON.stringify({ roles, permissions: Array.from(permissions) }));
    } catch { /* 忽略 Redis 写入失败 */ }

    next();
  } catch (err) {
    return res.status(401).json(fail('登录已过期，请重新登录', 401, req.reqId));
  }
}
