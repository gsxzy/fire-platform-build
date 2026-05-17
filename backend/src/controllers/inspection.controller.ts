import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sendSuccess, sendPage } from '@/utils/respond';
import { FireInspection } from '@/models';
import { parseIdStrict, sanitizeBody } from '@/utils/validator';

function parsePage(req: Request) {
  const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
  return { pageNum, pageSize };
}

export const InspectionController = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { inspectType, status, keyword } = req.query;
    const where: Record<string, unknown> = {};
    if (inspectType) where.inspect_type = inspectType;
    if (status !== undefined) where.status = status;
    if (keyword) {
      (where as { [Op.or]?: unknown })[Op.or] = [
        { inspect_no: { [Op.like]: `%${keyword}%` } },
        { unit_name: { [Op.like]: `%${keyword}%` } },
      ];
    }
    const { count, rows } = await FireInspection.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async create(req: Request, res: Response) {
    const inspectNo = `IN${Date.now()}${Math.floor(Math.random() * 100)}`;
    const i = await FireInspection.create({ ...sanitizeBody(req.body), inspect_no: inspectNo } as any);
    sendSuccess(res, req, { id: (i as any).id }, '创建成功');
  },

  async update(req: Request, res: Response) {
    await FireInspection.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async delete(req: Request, res: Response) {
    await FireInspection.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },
};
