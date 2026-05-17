import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { sendSuccess, sendPage } from '@/utils/respond';
import { HttpError } from '@/utils/httpError';
import { User, Role } from '@/models';
import logger from '@/config/logger';
import { sanitizePagination } from '@/utils/validator';

function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const UserController = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { keyword, status, deptId } = req.query;
    const where: Record<string, unknown> = {};
    if (keyword) {
      (where as { [Op.or]?: unknown })[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { real_name: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (status !== undefined) where.status = status;
    if (deptId) where.dept_id = deptId;

    const { count, rows } = await User.findAndCountAll({
      where,
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      attributes: { exclude: ['password'] },
      include: [{ model: Role, attributes: ['id', 'role_name', 'role_code'] }],
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async create(req: Request, res: Response) {
    const { username, password, realName, phone, email, status, deptId, roleIds } = req.body;
    const exists = await User.findOne({ where: { username } });
    if (exists) throw new HttpError('用户名已存在', 409);
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashed,
      real_name: realName,
      phone,
      email,
      status,
      dept_id: deptId,
    } as any);
    if (roleIds?.length) await (user as any).setRoles(roleIds);
    sendSuccess(res, req, { id: (user as any).id }, '创建成功');
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { realName, phone, email, status, deptId, roleIds } = req.body;
    await User.update(
      { real_name: realName, phone, email, status, dept_id: deptId },
      { where: { id } }
    );
    if (roleIds?.length) {
      const user = await User.findByPk(id);
      if (user) await (user as any).setRoles(roleIds);
    }
    sendSuccess(res, req, null, '更新成功');
  },

  async delete(req: Request, res: Response) {
    await User.destroy({ where: { id: req.params.id } });
    sendSuccess(res, req, null, '删除成功');
  },

  async resetPassword(req: Request, res: Response) {
    const newPwd = generateRandomPassword(10);
    const hashed = await bcrypt.hash(newPwd, 10);
    await User.update({ password: hashed }, { where: { id: req.params.id } });
    logger.info(`[User] 密码重置 id=${req.params.id}`);
    sendSuccess(res, req, { tempPassword: newPwd }, `密码已重置为临时密码: ${newPwd}，请尽快修改`);
  },
};
