import type { Request, Response } from 'express';
import { success, page } from '@/utils/response';
import { AIDecision, SmartAlert } from '@/models';

export const AIController = {
  async decisionList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10 } = req.query;
    const { count, rows } = await AIDecision.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize, order: [['created_at', 'DESC']] });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async decisionCreate(req: Request, res: Response) {
    const decisionNo = `AI${Date.now()}${Math.floor(Math.random() * 100)}`;
    const d = await AIDecision.create({ ...req.body, decision_no: decisionNo } as any);
    return res.json(success({ id: (d as any).id }, '分析完成'));
  },

  async alertList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, status } = req.query;
    const where: any = {};
    if (status !== undefined) where.status = status;
    const { count, rows } = await SmartAlert.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize, order: [['created_at', 'DESC']] });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async alertConfirm(req: Request, res: Response) {
    await SmartAlert.update({ status: 1 }, { where: { id: req.params.id } });
    return res.json(success(null, '已确认'));
  },
  async alertHandle(req: Request, res: Response) {
    await SmartAlert.update({ status: 2 }, { where: { id: req.params.id } });
    return res.json(success(null, '已处理'));
  },
};
