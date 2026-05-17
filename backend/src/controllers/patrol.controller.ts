import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { PatrolPlan, PatrolRecord, Hazard } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

function parsePage(req: Request) {
  const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
  return { pageNum, pageSize };
}

export const PatrolController = {
  async planList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { status } = req.query;
    const where: Record<string, unknown> = {};
    if (status !== undefined) where.status = status;
    const { count, rows } = await PatrolPlan.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async planCreate(req: Request, res: Response) {
    const p = await PatrolPlan.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (p as any).id }, '创建成功');
  },

  async planUpdate(req: Request, res: Response) {
    await PatrolPlan.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async planDelete(req: Request, res: Response) {
    await PatrolPlan.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async recordList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { count, rows } = await PatrolRecord.findAndCountAll({
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async recordById(req: Request, res: Response) {
    const r = await PatrolRecord.findByPk(req.params.id);
    sendSuccess(res, req, r || null);
  },

  async recordCreate(req: Request, res: Response) {
    const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
    const r = await PatrolRecord.create({ ...sanitizeBody(req.body), patrol_no: patrolNo } as any);
    sendSuccess(res, req, { id: (r as any).id }, '创建成功');
  },

  async recordUpdate(req: Request, res: Response) {
    await PatrolRecord.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async recordDelete(req: Request, res: Response) {
    await PatrolRecord.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async hazardList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { status, level } = req.query;
    const where: Record<string, unknown> = {};
    if (status !== undefined) where.status = status;
    if (level) where.level = level;
    const { count, rows } = await Hazard.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async hazardCreate(req: Request, res: Response) {
    const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
    const h = await Hazard.create({ ...sanitizeBody(req.body), hazard_no: hazardNo } as any);
    sendSuccess(res, req, { id: (h as any).id }, '创建成功');
  },

  async hazardUpdate(req: Request, res: Response) {
    await Hazard.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async hazardDelete(req: Request, res: Response) {
    await Hazard.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async hazardRectify(req: Request, res: Response) {
    await Hazard.update(
      { status: 2, rectification_date: new Date() },
      { where: { id: parseIdStrict(req.params.id) } }
    );
    sendSuccess(res, req, null, '已整改');
  },
};
