import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { sanitizePagination } from '@/utils/validator';
import { DeviceControlService } from '@/services/deviceControl.service';

export const DeviceControlController = {
  async sendCommand(req: Request, res: Response) {
    const { deviceId, cmdType, cmdParam } = req.body;
    const result = await DeviceControlService.sendCommand({
      deviceId: Number(deviceId),
      commandType: Number(cmdType),
      params: cmdParam ?? {},
      operatorId: req.user!.userId,
      operatorName: req.user!.username,
    });
    sendSuccess(res, req, result, result.message);
  },

  async remoteStartStop(req: Request, res: Response) {
    const { deviceId, action } = req.body;
    const result = await DeviceControlService.remoteStartStop(
      deviceId,
      action,
      req.user!.userId,
      req.user!.username
    );
    sendSuccess(res, req, result);
  },

  async remoteReset(req: Request, res: Response) {
    const { deviceId } = req.body;
    const result = await DeviceControlService.remoteReset(deviceId, req.user!.userId, req.user!.username);
    sendSuccess(res, req, result);
  },

  async silence(req: Request, res: Response) {
    const { deviceId } = req.body;
    const result = await DeviceControlService.silence(deviceId, req.user!.userId, req.user!.username);
    sendSuccess(res, req, result);
  },

  async batchCommand(req: Request, res: Response) {
    const { deviceIds, cmdType, param } = req.body;
    const ids = Array.isArray(deviceIds) ? deviceIds.map((id: unknown) => Number(id)) : [];
    const result = await DeviceControlService.batchControl(
      ids,
      Number(cmdType),
      param ?? {},
      req.user!.userId,
      req.user!.username
    );
    sendSuccess(res, req, result);
  },

  async commandHistory(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { deviceId } = req.query;
    const data = await DeviceControlService.getCommandHistory(
      deviceId ? +deviceId : undefined,
      +pageNum,
      +pageSize
    );
    sendPage(res, req, data.list, data.total, data.pageNum, data.pageSize);
  },
};
