import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { KnowledgeDoc } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

export const KnowledgeController = {
  async list(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { category, keyword  } = req.query;
      const where: any = {};
      if (category) where.category = category;
      if (keyword) where[Op.or] = [{ title: { [Op.like]: `%${keyword}%` } }, { content: { [Op.like]: `%${keyword}%` } }];
      const { count, rows } = await KnowledgeDoc.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
      return res.json(page(rows, count, +pageNum, +pageSize));
    } catch (err: any) {
      logger.error(`[KnowledgeController] list 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async create(req: Request, res: Response) {
    try {
      const doc = await KnowledgeDoc.create(sanitizeBody(req.body) as any);
      return res.json(success({ id: (doc as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[KnowledgeController] create 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async update(req: Request, res: Response) {
    try {
      await KnowledgeDoc.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[KnowledgeController] update 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async delete(req: Request, res: Response) {
    try {
      await KnowledgeDoc.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[KnowledgeController] delete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async categories(req: Request, res: Response) {
    try {
      const cats = await KnowledgeDoc.findAll({ attributes: ['category'], group: ['category'], raw: true, limit: 1000 });
      return res.json(success(cats.map((c: any) => c.category)));
    } catch (err: any) {
      logger.error(`[KnowledgeController] categories 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
