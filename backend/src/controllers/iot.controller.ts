import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, page } from '@/utils/response';
import { IoTDevice, ProtocolConfig, DataPipeline } from '@/models';

export const IoTController = {
  async deviceList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, keyword, protocolType, status } = req.query;
    const where: any = {};
    if (keyword) where[Op.or] = [{ device_name: { [Op.like]: `%${keyword}%` } }, { device_sn: { [Op.like]: `%${keyword}%` } }];
    if (protocolType) where.protocol_type = protocolType;
    if (status !== undefined) where.status = status;
    const { count, rows } = await IoTDevice.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async deviceCreate(req: Request, res: Response) {
    const device = await IoTDevice.create(req.body as any);
    return res.json(success({ id: (device as any).id }, '创建成功'));
  },
  async deviceUpdate(req: Request, res: Response) {
    await IoTDevice.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async deviceDelete(req: Request, res: Response) {
    await IoTDevice.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  async protocolList(req: Request, res: Response) {
    const list = await ProtocolConfig.findAll();
    return res.json(success(list));
  },
  async protocolCreate(req: Request, res: Response) {
    const p = await ProtocolConfig.create(req.body as any);
    return res.json(success({ id: (p as any).id }, '创建成功'));
  },
  async protocolUpdate(req: Request, res: Response) {
    await ProtocolConfig.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async protocolDelete(req: Request, res: Response) {
    await ProtocolConfig.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  async pipelineList(req: Request, res: Response) {
    const list = await DataPipeline.findAll();
    return res.json(success(list));
  },
  async pipelineCreate(req: Request, res: Response) {
    const p = await DataPipeline.create(req.body as any);
    return res.json(success({ id: (p as any).id }, '创建成功'));
  },
  async pipelineUpdate(req: Request, res: Response) {
    await DataPipeline.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
};
