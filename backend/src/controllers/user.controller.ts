import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { success, fail, page } from '@/utils/response';
import { User, Role } from '@/models';

export const UserController = {
  async list(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, keyword, status, deptId } = req.query;
    const where: any = {};
    if (keyword) where[Op.or] = [{ username: { [Op.like]: `%${keyword}%` } }, { real_name: { [Op.like]: `%${keyword}%` } }];
    if (status !== undefined) where.status = status;
    if (deptId) where.dept_id = deptId;

    const { count, rows } = await User.findAndCountAll({
      where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize,
      attributes: { exclude: ['password'] }, include: [{ model: Role, attributes: ['id', 'role_name', 'role_code'] }],
      order: [['created_at', 'DESC']],
    });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },

  async create(req: Request, res: Response) {
    const { username, password, realName, phone, email, status, deptId, roleIds } = req.body;
    const exists = await User.findOne({ where: { username } });
    if (exists) return res.json(fail('用户名已存在'));
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, real_name: realName, phone, email, status, dept_id: deptId } as any);
    if (roleIds?.length) await (user as any).setRoles(roleIds);
    return res.json(success({ id: (user as any).id }, '创建成功'));
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { realName, phone, email, status, deptId, roleIds } = req.body;
    await User.update({ real_name: realName, phone, email, status, dept_id: deptId }, { where: { id } });
    if (roleIds?.length) {
      const user = await User.findByPk(id);
      if (user) await (user as any).setRoles(roleIds);
    }
    return res.json(success(null, '更新成功'));
  },

  async delete(req: Request, res: Response) {
    await User.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  async resetPassword(req: Request, res: Response) {
    const hashed = await bcrypt.hash('123456', 10);
    await User.update({ password: hashed }, { where: { id: req.params.id } });
    return res.json(success(null, '密码已重置为123456'));
  },
};
