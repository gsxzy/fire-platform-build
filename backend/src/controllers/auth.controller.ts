import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { signToken } from '@/utils/jwt';
import { success, fail } from '@/utils/response';
import { User, Role, Permission } from '@/models';

export const AuthController = {
  async login(req: Request, res: Response) {
    const { username, password } = req.body;
    if (!username || !password) return res.json(fail('用户名和密码不能为空'));

    const user = await User.findOne({
      where: { username },
      include: [{ model: Role, include: [Permission] }]
    });
    if (!user) return res.json(fail('用户名或密码错误'));
    if ((user as any).status === 0) return res.json(fail('账号已被禁用'));

    const valid = await bcrypt.compare(password, (user as any).password);
    if (!valid) return res.json(fail('用户名或密码错误'));

    await User.update({ last_login: new Date(), login_ip: req.ip }, { where: { id: (user as any).id } });

    const roles = (user as any).roles?.map((r: any) => ({ id: r.id, name: r.role_name, code: r.role_code })) || [];
    const permissions = new Set<string>();
    (user as any).roles?.forEach((r: any) => r.permissions?.forEach((p: any) => permissions.add(p.perm_code)));

    const token = signToken({ userId: (user as any).id, username });
    return res.json(success({
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 86400,
      userInfo: {
        userId: (user as any).id,
        username: (user as any).username,
        realName: (user as any).real_name,
        avatar: (user as any).avatar,
        roles: roles.map((r: any) => r.code),
        permissions: Array.from(permissions),
      }
    }, '登录成功'));
  },

  async register(req: Request, res: Response) {
    const { username, password, realName, phone } = req.body;
    if (!username || !password) return res.json(fail('用户名和密码不能为空'));

    const exists = await User.findOne({ where: { username } });
    if (exists) return res.json(fail('用户名已存在'));

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, real_name: realName, phone } as any);
    return res.json(success({ id: (user as any).id }, '注册成功'));
  },

  async profile(req: Request, res: Response) {
    const user = await User.findByPk(req.user!.userId, {
      attributes: { exclude: ['password'] },
      include: [Role]
    });
    return res.json(success(user));
  },

  async updateProfile(req: Request, res: Response) {
    const { realName, phone, email, avatar } = req.body;
    await User.update({ real_name: realName, phone, email, avatar }, { where: { id: req.user!.userId } });
    return res.json(success(null, '更新成功'));
  },

  async changePassword(req: Request, res: Response) {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user!.userId) as any;
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.json(fail('原密码错误'));
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.update({ password: hashed }, { where: { id: req.user!.userId } });
    return res.json(success(null, '密码修改成功'));
  },
};
