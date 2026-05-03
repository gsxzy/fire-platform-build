import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, page } from '@/utils/response';
import { EmergencyPlan, EmergencyDrill } from '@/models';

export const PlanController = {
  async planList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10 } = req.query;
    const { count, rows } = await EmergencyPlan.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async planCreate(req: Request, res: Response) {
    const p = await EmergencyPlan.create(req.body as any);
    return res.json(success({ id: (p as any).id }, '创建成功'));
  },
  async planUpdate(req: Request, res: Response) {
    await EmergencyPlan.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async planDelete(req: Request, res: Response) {
    await EmergencyPlan.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  async drillList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10 } = req.query;
    const { count, rows } = await EmergencyDrill.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize, order: [['created_at', 'DESC']] });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async drillCreate(req: Request, res: Response) {
    const drillNo = `DR${Date.now()}${Math.floor(Math.random() * 100)}`;
    const d = await EmergencyDrill.create({ ...req.body, drill_no: drillNo } as any);
    return res.json(success({ id: (d as any).id }, '创建成功'));
  },
  async drillUpdate(req: Request, res: Response) {
    await EmergencyDrill.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async drillDelete(req: Request, res: Response) {
    await EmergencyDrill.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },
};
