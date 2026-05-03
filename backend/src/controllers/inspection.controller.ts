import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, page } from '@/utils/response';
import { FireInspection } from '@/models';

export const InspectionController = {
  async list(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, inspectType, status, keyword } = req.query;
    const where: any = {};
    if (inspectType) where.inspect_type = inspectType;
    if (status !== undefined) where.status = status;
    if (keyword) where[Op.or] = [{ inspect_no: { [Op.like]: `%${keyword}%` } }, { unit_name: { [Op.like]: `%${keyword}%` } }];
    const { count, rows } = await FireInspection.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize, order: [['created_at', 'DESC']] });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async create(req: Request, res: Response) {
    const inspectNo = `IN${Date.now()}${Math.floor(Math.random() * 100)}`;
    const i = await FireInspection.create({ ...req.body, inspect_no: inspectNo } as any);
    return res.json(success({ id: (i as any).id }, '创建成功'));
  },
  async update(req: Request, res: Response) {
    await FireInspection.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async delete(req: Request, res: Response) {
    await FireInspection.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },
};
