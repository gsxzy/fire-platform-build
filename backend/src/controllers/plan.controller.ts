import type { Request, Response } from 'express';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { EmergencyPlan, EmergencyDrill } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

export const PlanController = {
  async planList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { count, rows } = await EmergencyPlan.findAndCountAll({ limit: pageSize, offset: (pageNum - 1) * pageSize });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[PlanController] planList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async planCreate(req: Request, res: Response) {
    try {
      const p = await EmergencyPlan.create(sanitizeBody(req.body) as any);
      return res.json(success({ id: (p as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[PlanController] planCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async planUpdate(req: Request, res: Response) {
    try {
      await EmergencyPlan.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[PlanController] planUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async planDelete(req: Request, res: Response) {
    try {
      await EmergencyPlan.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[PlanController] planDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async drillList(req: Request, res: Response) {
    try {
      const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
      const { count, rows } = await EmergencyDrill.findAndCountAll({ limit: pageSize, offset: (pageNum - 1) * pageSize, order: [['created_at', 'DESC']] });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[PlanController] drillList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async drillCreate(req: Request, res: Response) {
    try {
      const drillNo = `DR${Date.now()}${Math.floor(Math.random() * 100)}`;
      const d = await EmergencyDrill.create({ ...sanitizeBody(req.body), drill_no: drillNo } as any);
      return res.json(success({ id: (d as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[PlanController] drillCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async drillUpdate(req: Request, res: Response) {
    try {
      await EmergencyDrill.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[PlanController] drillUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async drillDelete(req: Request, res: Response) {
    try {
      await EmergencyDrill.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[PlanController] drillDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
