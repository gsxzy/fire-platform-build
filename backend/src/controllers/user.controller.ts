import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { success, fail, page } from '@/utils/response';
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
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { keyword, status, deptId  } = req.query;
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
    } catch (err: any) {
      logger.error(`[User] list 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { username, password, realName, phone, email, status, deptId, roleIds } = req.body;
      const exists = await User.findOne({ where: { username } });
      if (exists) return res.status(409).json(fail('用户名已存在', 409));
      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ username, password: hashed, real_name: realName, phone, email, status, dept_id: deptId } as any);
      if (roleIds?.length) await (user as any).setRoles(roleIds);
      return res.json(success({ id: (user as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[User] create 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { realName, phone, email, status, deptId, roleIds } = req.body;
      await User.update({ real_name: realName, phone, email, status, dept_id: deptId }, { where: { id } });
      if (roleIds?.length) {
        const user = await User.findByPk(id);
        if (user) await (user as any).setRoles(roleIds);
      }
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[User] update 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await User.destroy({ where: { id: req.params.id } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[User] delete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const newPwd = generateRandomPassword(10);
      const hashed = await bcrypt.hash(newPwd, 10);
      await User.update({ password: hashed }, { where: { id: req.params.id } });
      logger.info(`[User] 密码重置 id=${req.params.id}`);
      return res.json(success({ tempPassword: newPwd }, `密码已重置为临时密码: ${newPwd}，请尽快修改`));
    } catch (err: any) {
      logger.error(`[User] resetPassword 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
