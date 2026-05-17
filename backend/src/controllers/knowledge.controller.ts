import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sendSuccess, sendPage } from '@/utils/respond';
import { KnowledgeDoc } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

export const KnowledgeController = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { category, keyword } = req.query;
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (keyword) {
      (where as { [Op.or]?: unknown })[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } },
      ];
    }
    const { count, rows } = await KnowledgeDoc.findAndCountAll({
      where,
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async create(req: Request, res: Response) {
    const doc = await KnowledgeDoc.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (doc as any).id }, '创建成功');
  },

  async update(req: Request, res: Response) {
    await KnowledgeDoc.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async delete(req: Request, res: Response) {
    await KnowledgeDoc.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async categories(req: Request, res: Response) {
    const cats = await KnowledgeDoc.findAll({
      attributes: ['category'],
      group: ['category'],
      raw: true,
      limit: 1000,
    });
    sendSuccess(res, req, cats.map((c: any) => c.category));
  },
};
