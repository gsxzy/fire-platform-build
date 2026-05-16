import type { Request, Response } from 'express';
import { success, page, fail } from '@/utils/response';
import { AIDecision, SmartAlert } from '@/models';
import logger from '@/config/logger';
import { sanitizePagination } from '@/utils/validator';

export const AIController = {
  async decisionList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { count, rows } = await AIDecision.findAndCountAll({
        limit: +pageSize,
        offset: (+pageNum - 1) * +pageSize,
        order: [['created_at', 'DESC']],
      });
      return res.json(page(rows, count, +pageNum, +pageSize));
    } catch (err: any) {
      logger.error(`[AI] decisionList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async decisionCreate(req: Request, res: Response) {
    try {
      const decisionNo = `AI${Date.now()}${Math.floor(Math.random() * 100)}`;
      const d = await AIDecision.create({ ...req.body, decision_no: decisionNo } as any);
      return res.json(success({ id: (d as any).id }, '分析完成'));
    } catch (err: any) {
      logger.error(`[AI] decisionCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async alertList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { status  } = req.query;
      const where: any = {};
      if (status !== undefined) where.status = status;
      const { count, rows } = await SmartAlert.findAndCountAll({
        where,
        limit: +pageSize,
        offset: (+pageNum - 1) * +pageSize,
        order: [['created_at', 'DESC']],
      });
      return res.json(page(rows, count, +pageNum, +pageSize));
    } catch (err: any) {
      logger.error(`[AI] alertList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async alertConfirm(req: Request, res: Response) {
    try {
      await SmartAlert.update({ status: 1 }, { where: { id: req.params.id } });
      return res.json(success(null, '已确认'));
    } catch (err: any) {
      logger.error(`[AI] alertConfirm 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async alertHandle(req: Request, res: Response) {
    try {
      await SmartAlert.update({ status: 2 }, { where: { id: req.params.id } });
      return res.json(success(null, '已处理'));
    } catch (err: any) {
      logger.error(`[AI] alertHandle 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
