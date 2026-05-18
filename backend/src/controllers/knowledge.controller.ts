import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sendSuccess, sendPage } from '@/utils/respond';
import { KnowledgeDoc, DocCategory } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';
import logger from '@/config/logger';

export const KnowledgeController = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { category, keyword } = req.query;
    const where: Record<string, unknown> = {};
    if (category) where.category = category;

    let rows: any[];
    let count: number;

    if (keyword && String(keyword).trim()) {
      // 优先使用 FULLTEXT 全文检索（MySQL 5.6+）
      const kw = String(keyword).trim();
      try {
        const [results, total] = await Promise.all([
          KnowledgeDoc.sequelize!.query(
            `SELECT * FROM fire_knowledge_doc WHERE MATCH(title, content) AGAINST(:kw IN BOOLEAN MODE) ${category ? 'AND category = :cat' : ''} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
            { replacements: { kw: `${kw}*`, cat: category, limit: +pageSize, offset: (+pageNum - 1) * +pageSize }, type: 'SELECT' }
          ),
          KnowledgeDoc.sequelize!.query(
            `SELECT COUNT(*) as total FROM fire_knowledge_doc WHERE MATCH(title, content) AGAINST(:kw IN BOOLEAN MODE) ${category ? 'AND category = :cat' : ''}`,
            { replacements: { kw: `${kw}*`, cat: category }, type: 'SELECT' }
          ),
        ]);
        rows = results as any[];
        count = Number((total as any[])[0]?.total || 0);
      } catch (err: any) {
        logger.warn(`[Knowledge] FULLTEXT search failed, fallback to LIKE: ${err.message}`);
        (where as { [Op.or]?: unknown })[Op.or] = [
          { title: { [Op.like]: `%${kw}%` } },
          { content: { [Op.like]: `%${kw}%` } },
        ];
        const result = await KnowledgeDoc.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
        rows = result.rows;
        count = result.count;
      }
    } else {
      const result = await KnowledgeDoc.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
      rows = result.rows;
      count = result.count;
    }
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async byId(req: Request, res: Response) {
    const doc = await KnowledgeDoc.findByPk(req.params.id);
    sendSuccess(res, req, doc || null);
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
    // 优先从 doc_categories 独立分类表读取
    const cats = await DocCategory.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']], raw: true });
    if (cats.length > 0) {
      sendSuccess(res, req, (cats as any[]).map(c => ({ id: c.id, name: c.name, parentId: c.parent_id })));
      return;
    }
    // 降级：从文档记录动态提取（兼容旧数据）
    const docCats = await KnowledgeDoc.findAll({
      attributes: ['category'],
      group: ['category'],
      raw: true,
      limit: 1000,
    });
    sendSuccess(res, req, docCats.map((c: any) => c.category));
  },

  async categoryList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { count, rows } = await DocCategory.findAndCountAll({
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async categoryCreate(req: Request, res: Response) {
    const c = await DocCategory.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (c as any).id }, '创建成功');
  },

  async categoryUpdate(req: Request, res: Response) {
    await DocCategory.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async categoryDelete(req: Request, res: Response) {
    await DocCategory.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async upload(req: Request, res: Response) {
    const file = (req as any).file;
    if (!file) throw new Error('未收到文件');
    const url = `/uploads/${file.fieldname}/${file.filename}`;
    sendSuccess(res, req, { url, originalName: file.originalname, size: file.size }, '上传成功');
  },
};
