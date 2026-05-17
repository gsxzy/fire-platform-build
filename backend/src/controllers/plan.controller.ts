import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { EmergencyPlan, EmergencyDrill } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

function parsePage(req: Request) {
  const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
  return { pageNum, pageSize };
}

export const PlanController = {
  async planList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { count, rows } = await EmergencyPlan.findAndCountAll({
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async planCreate(req: Request, res: Response) {
    const p = await EmergencyPlan.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (p as any).id }, '创建成功');
  },

  async planUpdate(req: Request, res: Response) {
    await EmergencyPlan.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async planDelete(req: Request, res: Response) {
    await EmergencyPlan.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async drillList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { count, rows } = await EmergencyDrill.findAndCountAll({
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async drillCreate(req: Request, res: Response) {
    const drillNo = `DR${Date.now()}${Math.floor(Math.random() * 100)}`;
    const d = await EmergencyDrill.create({ ...sanitizeBody(req.body), drill_no: drillNo } as any);
    sendSuccess(res, req, { id: (d as any).id }, '创建成功');
  },

  async drillUpdate(req: Request, res: Response) {
    await EmergencyDrill.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async drillDelete(req: Request, res: Response) {
    await EmergencyDrill.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },
};
