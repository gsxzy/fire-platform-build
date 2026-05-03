import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, fail, page } from '@/utils/response';
import { ControlRoom, ControlRoomHost, MultilinePanel, BusPoint, Device, HostCommandLog } from '@/models';
import { ControlRoomService } from '@/services/controlRoom.service';

export const ControlRoomController = {
  /* ── 消控室 ── */
  async list(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, keyword } = req.query;
    const where: any = {};
    if (keyword) where[Op.or] = [{ room_name: { [Op.like]: `%${keyword}%` } }, { unit_name: { [Op.like]: `%${keyword}%` } }];
    const { count, rows } = await ControlRoom.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async create(req: Request, res: Response) {
    const room = await ControlRoom.create(req.body as any);
    return res.json(success({ id: (room as any).id }, '创建成功'));
  },
  async update(req: Request, res: Response) {
    await ControlRoom.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async delete(req: Request, res: Response) {
    await ControlRoom.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },
  async detail(req: Request, res: Response) {
    const room = await ControlRoom.findByPk(req.params.id);
    if (!room) return res.json(fail('消控室不存在'));
    const [hosts, devices] = await Promise.all([
      ControlRoomHost.findAll({ where: { room_id: (room as any).id } }),
      Device.findAll({ where: { unit_id: (room as any).unit_id }, limit: 20 }),
    ]);
    return res.json(success({ room, hosts, devices }));
  },

  /* ── 报警主机 ── */
  async hostList(req: Request, res: Response) {
    const { roomId } = req.query;
    const where: any = {};
    if (roomId) where.room_id = roomId;
    const hosts = await ControlRoomHost.findAll({ where, order: [['id', 'ASC']] });
    return res.json(success(hosts));
  },
  async hostCreate(req: Request, res: Response) {
    const host = await ControlRoomHost.create(req.body as any);
    return res.json(success({ id: (host as any).id }, '主机添加成功'));
  },
  async hostUpdate(req: Request, res: Response) {
    await ControlRoomHost.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async hostDelete(req: Request, res: Response) {
    await ControlRoomHost.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },
  async hostDetail(req: Request, res: Response) {
    const data = await ControlRoomService.getHostDetail(+req.params.id);
    if (!data) return res.json(fail('主机不存在'));
    return res.json(success(data));
  },

  /* ── 消音（通过报警主机） ── */
  async silence(req: Request, res: Response) {
    const { hostId } = req.body;
    const result = await ControlRoomService.silenceHost(+hostId, req.user!.userId, req.user!.username);
    return res.json(success(result, result.msg));
  },

  /* ── 复位（通过报警主机） ── */
  async reset(req: Request, res: Response) {
    const { hostId } = req.body;
    const result = await ControlRoomService.resetHost(+hostId, req.user!.userId, req.user!.username);
    return res.json(success(result, result.msg));
  },

  /* ── 手自动切换（通过报警主机） ── */
  async switchMode(req: Request, res: Response) {
    const { hostId, mode } = req.body;
    const result = await ControlRoomService.switchMode(+hostId, mode, req.user!.userId, req.user!.username);
    return res.json(success(result, result.msg));
  },

  /* ── 多线盘控制（通过报警主机） ── */
  async controlMultiline(req: Request, res: Response) {
    const { hostId, pointId, action } = req.body;
    const result = await ControlRoomService.controlMultiline(+hostId, +pointId, action, req.user!.userId, req.user!.username);
    return res.json(success(result, result.msg));
  },

  /* ── 多线盘点位 ── */
  async multilineList(req: Request, res: Response) {
    const { hostId } = req.query;
    const where: any = {};
    if (hostId) where.host_id = hostId;
    const list = await MultilinePanel.findAll({ where, order: [['point_no', 'ASC']] });
    return res.json(success(list));
  },
  async multilineCreate(req: Request, res: Response) {
    const p = await MultilinePanel.create(req.body as any);
    return res.json(success({ id: (p as any).id }, '创建成功'));
  },
  async multilineUpdate(req: Request, res: Response) {
    await MultilinePanel.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },

  /* ── 总线点位 ── */
  async busPointList(req: Request, res: Response) {
    const { hostId, loopNo, status } = req.query;
    const where: any = {};
    if (hostId) where.host_id = hostId;
    if (loopNo) where.loop_no = loopNo;
    if (status !== undefined) where.status = status;
    const list = await BusPoint.findAll({ where, order: [['loop_no', 'ASC'], ['point_no', 'ASC']] });
    return res.json(success(list));
  },
  async busPointCreate(req: Request, res: Response) {
    const p = await BusPoint.create(req.body as any);
    return res.json(success({ id: (p as any).id }, '创建成功'));
  },
  async busPointUpdate(req: Request, res: Response) {
    await BusPoint.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },

  /* ── 控制日志 ── */
  async commandLogs(req: Request, res: Response) {
    const { hostId, pageNum = 1, pageSize = 20 } = req.query;
    const data = await ControlRoomService.getCommandLogs(
      hostId ? +hostId : undefined, +pageNum, +pageSize
    );
    return res.json(page(data.list, data.total, data.pageNum, data.pageSize));
  },
};
