import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, page } from '@/utils/response';
import { KnowledgeDoc } from '@/models';

export const KnowledgeController = {
  async list(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, category, keyword } = req.query;
    const where: any = {};
    if (category) where.category = category;
    if (keyword) where[Op.or] = [{ title: { [Op.like]: `%${keyword}%` } }, { content: { [Op.like]: `%${keyword}%` } }];
    const { count, rows } = await KnowledgeDoc.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async create(req: Request, res: Response) {
    const doc = await KnowledgeDoc.create(req.body as any);
    return res.json(success({ id: (doc as any).id }, '创建成功'));
  },
  async update(req: Request, res: Response) {
    await KnowledgeDoc.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async delete(req: Request, res: Response) {
    await KnowledgeDoc.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },
  async categories(req: Request, res: Response) {
    const cats = await KnowledgeDoc.findAll({ attributes: ['category'], group: ['category'], raw: true });
    return res.json(success(cats.map((c: any) => c.category)));
  },
};
