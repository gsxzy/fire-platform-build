import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { DispatchRecord } from '@/models';
import { Op } from 'sequelize';
import { sanitizePagination } from '@/utils/validator';

export const DispatchController = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { status, phase, keyword, startTime, endTime } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (phase) where.phase = phase;
    if (startTime && endTime) where.created_at = { [Op.between]: [startTime, endTime] };
    if (keyword) {
      where[Op.or] = [
        { alarm_no: { [Op.like]: `%${keyword}%` } },
        { handler_name: { [Op.like]: `%${keyword}%` } },
        { unit_name: { [Op.like]: `%${keyword}%` } },
        { device_name: { [Op.like]: `%${keyword}%` } },
      ];
    }
    const { count, rows } = await DispatchRecord.findAndCountAll({
      where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async byId(req: Request, res: Response) {
    const row = await DispatchRecord.findByPk(req.params.id);
    sendSuccess(res, req, row);
  },

  async stats(req: Request, res: Response) {
    const total = await DispatchRecord.count();
    const pending = await DispatchRecord.count({ where: { status: 'pending' } });
    const handling = await DispatchRecord.count({ where: { status: 'handling' } });
    const resolved = await DispatchRecord.count({ where: { status: 'resolved' } });
    const confirmedFalse = await DispatchRecord.count({ where: { status: 'confirmed_false' } });
    sendSuccess(res, req, { total, pending, handling, resolved, confirmedFalse });
  },
};
