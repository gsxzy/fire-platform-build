import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { fail } from '@/utils/response';
import { MultilinePanel, BusPoint } from '@/models';
import { ControlRoomService } from '@/services/controlRoom.service';
import logger from '@/config/logger';

export async function multilineList(req: Request, res: Response) {
  try {
    const { hostId } = req.query;
    const where: any = {};
    if (hostId) where.host_id = hostId;
    const list = await MultilinePanel.findAll({ where, order: [['point_no', 'ASC']] });
    sendSuccess(res, req, list);
  } catch (err: any) {
    logger.error(`[ControlRoom] multilineList 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function multilineCreate(req: Request, res: Response) {
  try {
    const p = await MultilinePanel.create(req.body as any);
    sendSuccess(res, req, { id: (p as any).id }, '创建成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] multilineCreate 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function multilineUpdate(req: Request, res: Response) {
  try {
    await MultilinePanel.update(req.body, { where: { id: req.params.id } });
    sendSuccess(res, req, null, '更新成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] multilineUpdate 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function busPointList(req: Request, res: Response) {
  try {
    const { hostId, loopNo, status } = req.query;
    const where: any = {};
    if (hostId) where.host_id = hostId;
    if (loopNo) where.loop_no = loopNo;
    if (status !== undefined) where.status = status;
    const list = await BusPoint.findAll({ where, order: [['loop_no', 'ASC'], ['point_no', 'ASC']] });
    sendSuccess(res, req, list);
  } catch (err: any) {
    logger.error(`[ControlRoom] busPointList 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function busPointCreate(req: Request, res: Response) {
  try {
    const p = await BusPoint.create(req.body as any);
    sendSuccess(res, req, { id: (p as any).id }, '创建成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] busPointCreate 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function busPointUpdate(req: Request, res: Response) {
  try {
    await BusPoint.update(req.body, { where: { id: req.params.id } });
    sendSuccess(res, req, null, '更新成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] busPointUpdate 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function commandLogs(req: Request, res: Response) {
  try {
    const { hostId, pageNum = 1, pageSize = 20 } = req.query;
    const data = await ControlRoomService.getCommandLogs(
      hostId ? +hostId : undefined, +pageNum, +pageSize
    );
    sendPage(res, req, data.list, data.total, data.pageNum, data.pageSize);
  } catch (err: any) {
    logger.error(`[ControlRoom] commandLogs 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}
