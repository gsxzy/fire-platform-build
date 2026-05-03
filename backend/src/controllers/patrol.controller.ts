import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, page } from '@/utils/response';
import { PatrolPlan, PatrolRecord, Hazard } from '@/models';

export const PatrolController = {
  /* ── 巡检计划 ── */
  async planList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, status } = req.query;
    const where: any = {};
    if (status !== undefined) where.status = status;
    const { count, rows } = await PatrolPlan.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async planCreate(req: Request, res: Response) {
    const p = await PatrolPlan.create(req.body as any);
    return res.json(success({ id: (p as any).id }, '创建成功'));
  },
  async planUpdate(req: Request, res: Response) {
    await PatrolPlan.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async planDelete(req: Request, res: Response) {
    await PatrolPlan.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  /* ── 巡检记录 ── */
  async recordList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10 } = req.query;
    const { count, rows } = await PatrolRecord.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize, order: [['created_at', 'DESC']] });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async recordCreate(req: Request, res: Response) {
    const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
    const r = await PatrolRecord.create({ ...req.body, patrol_no: patrolNo } as any);
    return res.json(success({ id: (r as any).id }, '创建成功'));
  },

  /* ── 隐患管理 ── */
  async hazardList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, status, level } = req.query;
    const where: any = {};
    if (status !== undefined) where.status = status;
    if (level) where.level = level;
    const { count, rows } = await Hazard.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize, order: [['created_at', 'DESC']] });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async hazardCreate(req: Request, res: Response) {
    const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
    const h = await Hazard.create({ ...req.body, hazard_no: hazardNo } as any);
    return res.json(success({ id: (h as any).id }, '创建成功'));
  },
  async hazardUpdate(req: Request, res: Response) {
    await Hazard.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async hazardRectify(req: Request, res: Response) {
    await Hazard.update({ status: 2, rectification_date: new Date() }, { where: { id: req.params.id } });
    return res.json(success(null, '已整改'));
  },
};
