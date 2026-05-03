import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, page } from '@/utils/response';
import { Device, Unit } from '@/models';

export const DeviceController = {
  async list(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, keyword, deviceType, unitId, status } = req.query;
    const where: any = {};
    if (keyword) where[Op.or] = [{ device_name: { [Op.like]: `%${keyword}%` } }, { device_no: { [Op.like]: `%${keyword}%` } }];
    if (deviceType) where.device_type = deviceType;
    if (unitId) where.unit_id = unitId;
    if (status !== undefined) where.status = status;

    const { count, rows } = await Device.findAndCountAll({
      where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize,
      include: [{ model: Unit, attributes: ['id', 'unit_name'] }],
      order: [['created_at', 'DESC']],
    });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },

  async create(req: Request, res: Response) {
    const device = await Device.create(req.body as any);
    return res.json(success({ id: (device as any).id }, '创建成功'));
  },

  async update(req: Request, res: Response) {
    await Device.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },

  async delete(req: Request, res: Response) {
    await Device.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  async stats(req: Request, res: Response) {
    const total = await Device.count();
    const online = await Device.count({ where: { status: 1 } });
    const offline = await Device.count({ where: { status: 3 } });
    const fault = await Device.count({ where: { status: 2 } });
    return res.json(success({ total, online, offline, fault, onlineRate: total ? ((online / total) * 100).toFixed(1) : 0 }));
  },

  async types(req: Request, res: Response) {
    const types = await Device.findAll({
      attributes: ['device_type', [Device.sequelize!.fn('COUNT', '*'), 'count']],
      group: ['device_type'], raw: true,
    });
    return res.json(success(types));
  },
};
