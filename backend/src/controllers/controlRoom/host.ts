import type { Request, Response } from 'express';
import { sendSuccess, sendDeleted } from '@/utils/respond';
import { fail } from '@/utils/response';
import { ControlRoomHost } from '@/models';
import { ControlRoomService } from '@/services/controlRoom.service';
import logger from '@/config/logger';

export async function hostList(req: Request, res: Response) {
  try {
    const { roomId } = req.query;
    const where: any = {};
    if (roomId) where.room_id = roomId;
    const hosts = await ControlRoomHost.findAll({ where, order: [['id', 'ASC']] });
    sendSuccess(res, req, hosts);
  } catch (err: any) {
    logger.error(`[ControlRoom] hostList 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function hostCreate(req: Request, res: Response) {
  try {
    const host = await ControlRoomHost.create(req.body as any);
    sendSuccess(res, req, { id: (host as any).id }, '主机添加成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] hostCreate 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function hostUpdate(req: Request, res: Response) {
  try {
    await ControlRoomHost.update(req.body, { where: { id: req.params.id } });
    sendSuccess(res, req, null, '更新成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] hostUpdate 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function hostDelete(req: Request, res: Response) {
  try {
    await ControlRoomHost.destroy({ where: { id: req.params.id } });
    sendDeleted(res, req);
  } catch (err: any) {
    logger.error(`[ControlRoom] hostDelete 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function hostDetail(req: Request, res: Response) {
  try {
    const data = await ControlRoomService.getHostDetail(+req.params.id);
    if (!data) return res.json(fail('主机不存在'));
    sendSuccess(res, req, data);
  } catch (err: any) {
    logger.error(`[ControlRoom] hostDetail 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function silence(req: Request, res: Response) {
  try {
    const { hostId } = req.body;
    const result = await ControlRoomService.silenceHost(+hostId, req.user!.userId, req.user!.username);
    sendSuccess(res, req, result, result.msg);
  } catch (err: any) {
    logger.error(`[ControlRoom] silence 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function reset(req: Request, res: Response) {
  try {
    const { hostId } = req.body;
    const result = await ControlRoomService.resetHost(+hostId, req.user!.userId, req.user!.username);
    sendSuccess(res, req, result, result.msg);
  } catch (err: any) {
    logger.error(`[ControlRoom] reset 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function switchMode(req: Request, res: Response) {
  try {
    const { hostId, mode } = req.body;
    const result = await ControlRoomService.switchMode(+hostId, mode, req.user!.userId, req.user!.username);
    sendSuccess(res, req, result, result.msg);
  } catch (err: any) {
    logger.error(`[ControlRoom] switchMode 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function controlMultiline(req: Request, res: Response) {
  try {
    const { hostId, pointId, action } = req.body;
    const result = await ControlRoomService.controlMultiline(+hostId, +pointId, action, req.user!.userId, req.user!.username);
    sendSuccess(res, req, result, result.msg);
  } catch (err: any) {
    logger.error(`[ControlRoom] controlMultiline 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}
