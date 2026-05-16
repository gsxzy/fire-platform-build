import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { FireInspection } from '@/models';
import { parseIdStrict, sanitizeBody } from '@/utils/validator';

export const InspectionController = {
  async list(req: Request, res: Response) {
    try {
      const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
      const { inspectType, status, keyword } = req.query;
      const where: any = {};
      if (inspectType) where.inspect_type = inspectType;
      if (status !== undefined) where.status = status;
      if (keyword) where[Op.or] = [{ inspect_no: { [Op.like]: `%${keyword}%` } }, { unit_name: { [Op.like]: `%${keyword}%` } }];
      const { count, rows } = await FireInspection.findAndCountAll({ where, limit: pageSize, offset: (pageNum - 1) * pageSize, order: [['created_at', 'DESC']] });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[InspectionController] list 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async create(req: Request, res: Response) {
    try {
      const inspectNo = `IN${Date.now()}${Math.floor(Math.random() * 100)}`;
      const i = await FireInspection.create({ ...sanitizeBody(req.body), inspect_no: inspectNo } as any);
      return res.json(success({ id: (i as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[InspectionController] create 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async update(req: Request, res: Response) {
    try {
      await FireInspection.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[InspectionController] update 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async delete(req: Request, res: Response) {
    try {
      await FireInspection.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[InspectionController] delete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
