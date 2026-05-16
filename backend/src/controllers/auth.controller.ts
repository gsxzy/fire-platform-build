import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, decodeUserIdIgnoreExpiration } from '@/utils/jwt';
import { success, fail } from '@/utils/response';
import { User, Role, Permission } from '@/models';
import logger from '@/config/logger';
import {
  generateRefreshToken,
  storeRefreshToken,
  getRefreshTokenData,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from '@/services/refreshToken.service';

function buildLoginUserPayload(user: any, roles: { id: number; name: string; code: string }[], permissions: string[]) {
  return {
    id: user.id,
    userId: user.id,
    username: user.username,
    realName: user.real_name,
    real_name: user.real_name,
    avatar: user.avatar,
    roles: roles.map((r) => r.code),
    permissions,
  };
}

export const AuthController = {
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json(fail('用户名和密码不能为空', 400));

      const user = await User.findOne({
        where: { username },
        include: [{ model: Role, include: [Permission] }],
      });
      if (!user) return res.status(401).json(fail('用户名或密码错误', 401));
      if ((user as any).status === 0) return res.status(403).json(fail('账号已被禁用', 403));

      const valid = await bcrypt.compare(password, (user as any).password);
      if (!valid) return res.status(401).json(fail('用户名或密码错误', 401));

      await User.update(
        { last_login: new Date(), login_ip: req.ip },
        { where: { id: (user as any).id } }
      );

      const roles =
        (user as any).roles?.map((r: any) => ({ id: r.id, name: r.role_name, code: r.role_code })) || [];
      const permissions = new Set<string>();
      (user as any).roles?.forEach((r: any) =>
        r.permissions?.forEach((p: any) => permissions.add(p.perm_code))
      );

      const accessToken = signToken({ userId: (user as any).id, username });
      const refreshToken = generateRefreshToken();
      await storeRefreshToken(
        refreshToken,
        (user as any).id,
        username,
        roles.map((r: { code: string }) => r.code)
      );

      const userPayload = buildLoginUserPayload(user, roles, Array.from(permissions));

      return res.json(
        success(
          {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: 86400,
            user: userPayload,
            userInfo: userPayload,
          },
          '登录成功'
        )
      );
    } catch (err: any) {
      logger.error(`[Auth] login 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`登录失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) return res.status(400).json(fail('refreshToken 不能为空', 400));

      const data = await getRefreshTokenData(refreshToken);
      if (!data) return res.status(401).json(fail('refreshToken 无效或已过期', 401));

      await revokeRefreshToken(refreshToken);

      const user = await User.findByPk(data.userId, {
        include: [{ model: Role, include: [Permission] }],
      });
      if (!user || (user as any).status === 0) {
        return res.status(401).json(fail('用户不存在或已被禁用', 401));
      }

      const roles =
        (user as any).roles?.map((r: any) => ({ id: r.id, name: r.role_name, code: r.role_code })) || [];
      const permissions = new Set<string>();
      (user as any).roles?.forEach((r: any) =>
        r.permissions?.forEach((p: any) => permissions.add(p.perm_code))
      );

      const accessToken = signToken({ userId: (user as any).id, username: (user as any).username });
      const newRefresh = generateRefreshToken();
      await storeRefreshToken(
        newRefresh,
        (user as any).id,
        (user as any).username,
        roles.map((r: { code: string }) => r.code)
      );

      return res.json(success({ accessToken, refreshToken: newRefresh }, 'Token 刷新成功'));
    } catch (err: any) {
      logger.error(`[Auth] refresh 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`刷新失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = (req.body || {}) as { refreshToken?: string };
      if (refreshToken) await revokeRefreshToken(refreshToken);

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const uid = decodeUserIdIgnoreExpiration(token);
        if (uid != null) await revokeAllUserRefreshTokens(uid);
      }

      return res.json(success(null, '登出成功'));
    } catch (err: any) {
      logger.error(`[Auth] logout 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`登出失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { username, password, realName, phone } = req.body;
      if (!username || !password) return res.status(400).json(fail('用户名和密码不能为空', 400));

      const exists = await User.findOne({ where: { username } });
      if (exists) return res.status(409).json(fail('用户名已存在', 409));

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ username, password: hashed, real_name: realName, phone } as any);
      return res.json(success({ id: (user as any).id }, '注册成功'));
    } catch (err: any) {
      logger.error(`[Auth] register 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`注册失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async profile(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user!.userId, {
        attributes: { exclude: ['password'] },
        include: [Role],
      });
      return res.json(success(user));
    } catch (err: any) {
      logger.error(`[Auth] profile 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`获取失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async updateProfile(req: Request, res: Response) {
    try {
      const { realName, phone, email, avatar } = req.body;
      await User.update(
        { real_name: realName, phone, email, avatar },
        { where: { id: req.user!.userId } }
      );
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[Auth] updateProfile 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`更新失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json(fail('原密码和新密码不能为空', 400));
      }
      const user = (await User.findByPk(req.user!.userId)) as any;
      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) return res.status(400).json(fail('原密码错误', 400));
      const hashed = await bcrypt.hash(newPassword, 10);
      await User.update({ password: hashed }, { where: { id: req.user!.userId } });
      await revokeAllUserRefreshTokens(req.user!.userId);
      return res.json(success(null, '密码修改成功'));
    } catch (err: any) {
      logger.error(`[Auth] changePassword 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`修改失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
