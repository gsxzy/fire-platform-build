import type { Request, Response } from 'express';
import { sendSuccess, sendDeleted } from '@/utils/response';
import { Role, Permission } from '@/models';

export const RoleController = {
  async list(req: Request, res: Response) {
    const roles = await Role.findAll({
      include: [{ model: Permission, attributes: ['id', 'perm_name', 'perm_code'] }],
    });
    sendSuccess(res, req, roles);
  },

  async create(req: Request, res: Response) {
    const role = await Role.create(req.body as any);
    sendSuccess(res, req, { id: (role as any).id }, '创建成功');
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { roleName, roleCode, description, status, permIds } = req.body;
    await Role.update(
      { role_name: roleName, role_code: roleCode, description, status },
      { where: { id } }
    );
    if (permIds?.length) {
      const role = await Role.findByPk(id);
      if (role) await (role as any).setPermissions(permIds);
    }
    sendSuccess(res, req, null, '更新成功');
  },

  async delete(req: Request, res: Response) {
    await Role.destroy({ where: { id: req.params.id } });
    sendDeleted(res, req);
  },
};
