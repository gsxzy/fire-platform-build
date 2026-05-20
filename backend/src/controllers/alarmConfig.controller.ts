import type { Request, Response } from 'express';
import { sendSuccess, sendDeleted, sendPage } from '@/utils/respond';
import { AlarmThreshold, AlarmNotifyPolicy } from '@/models';
import { Op } from 'sequelize';

/* ── 阈值规则 ── */

export const AlarmThresholdController = {
  async list(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 20, status, keyword } = req.query as any;
    const where: any = {};
    if (status !== undefined) where.status = Number(status);
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { device_type: { [Op.like]: `%${keyword}%` } },
        { metric_type: { [Op.like]: `%${keyword}%` } },
      ];
    }
    const { count, rows } = await AlarmThreshold.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset: (pageNum - 1) * pageSize,
      limit: Number(pageSize),
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async create(req: Request, res: Response) {
    const row = await AlarmThreshold.create(req.body);
    sendSuccess(res, req, row, '创建成功');
  },

  async update(req: Request, res: Response) {
    const row = await AlarmThreshold.findByPk(req.params.id);
    if (!row) throw new Error('规则不存在');
    await row.update(req.body);
    sendSuccess(res, req, row, '更新成功');
  },

  async delete(req: Request, res: Response) {
    const row = await AlarmThreshold.findByPk(req.params.id);
    if (!row) throw new Error('规则不存在');
    await row.destroy();
    sendDeleted(res, req);
  },

  async byId(req: Request, res: Response) {
    const row = await AlarmThreshold.findByPk(req.params.id);
    sendSuccess(res, req, row);
  },
};

/* ── 通知策略 ── */

export const AlarmNotifyPolicyController = {
  async list(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 20, status, keyword } = req.query as any;
    const where: any = {};
    if (status !== undefined) where.status = Number(status);
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
      ];
    }
    const { count, rows } = await AlarmNotifyPolicy.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset: (pageNum - 1) * pageSize,
      limit: Number(pageSize),
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async create(req: Request, res: Response) {
    const row = await AlarmNotifyPolicy.create(req.body);
    sendSuccess(res, req, row, '创建成功');
  },

  async update(req: Request, res: Response) {
    const row = await AlarmNotifyPolicy.findByPk(req.params.id);
    if (!row) throw new Error('策略不存在');
    await row.update(req.body);
    sendSuccess(res, req, row, '更新成功');
  },

  async delete(req: Request, res: Response) {
    const row = await AlarmNotifyPolicy.findByPk(req.params.id);
    if (!row) throw new Error('策略不存在');
    await row.destroy();
    sendDeleted(res, req);
  },

  async byId(req: Request, res: Response) {
    const row = await AlarmNotifyPolicy.findByPk(req.params.id);
    sendSuccess(res, req, row);
  },
};
