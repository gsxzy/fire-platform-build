import type { Request, Response } from 'express';
import { success, fail } from '@/utils/response';
import { Role, Permission } from '@/models';
import logger from '@/config/logger';

export const RoleController = {
  async list(req: Request, res: Response) {
    try {
      const roles = await Role.findAll({ include: [{ model: Permission, attributes: ['id', 'perm_name', 'perm_code'] }] });
      return res.json(success(roles));
    } catch (err: any) {
      logger.error(`[Role] list 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async create(req: Request, res: Response) {
    try {
      const role = await Role.create(req.body as any);
      return res.json(success({ id: (role as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[Role] create 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { roleName, roleCode, description, status, permIds } = req.body;
      await Role.update({ role_name: roleName, role_code: roleCode, description, status }, { where: { id } });
      if (permIds?.length) {
        const role = await Role.findByPk(id);
        if (role) await (role as any).setPermissions(permIds);
      }
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[Role] update 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await Role.destroy({ where: { id: req.params.id } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[Role] delete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
