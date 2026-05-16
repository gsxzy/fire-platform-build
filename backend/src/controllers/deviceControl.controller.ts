import type { Request, Response } from 'express';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { sanitizePagination } from '@/utils/validator';
import { DeviceControlService } from '@/services/deviceControl.service';

export const DeviceControlController = {
  async sendCommand(req: Request, res: Response) {
    try {
      const { deviceId, cmdType, cmdParam } = req.body;
      const result = await DeviceControlService.sendCommand({
        deviceId: Number(deviceId),
        commandType: Number(cmdType),
        params: cmdParam ?? {},
        operatorId: req.user!.userId,
        operatorName: req.user!.username,
      });
      return res.json(success(result, result.message));
    } catch (err: any) {
      logger.error(`[DeviceControl] sendCommand 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async remoteStartStop(req: Request, res: Response) {
    try {
      const { deviceId, action } = req.body;
      const result = await DeviceControlService.remoteStartStop(deviceId, action, req.user!.userId, req.user!.username);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[DeviceControl] remoteStartStop 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async remoteReset(req: Request, res: Response) {
    try {
      const { deviceId } = req.body;
      const result = await DeviceControlService.remoteReset(deviceId, req.user!.userId, req.user!.username);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[DeviceControl] remoteReset 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async silence(req: Request, res: Response) {
    try {
      const { deviceId } = req.body;
      const result = await DeviceControlService.silence(deviceId, req.user!.userId, req.user!.username);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[DeviceControl] silence 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async batchCommand(req: Request, res: Response) {
    try {
      const { deviceIds, cmdType, param } = req.body;
      const ids = Array.isArray(deviceIds) ? deviceIds.map((id: unknown) => Number(id)) : [];
      const result = await DeviceControlService.batchControl(ids, Number(cmdType), param ?? {}, req.user!.userId, req.user!.username);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[DeviceControl] batchCommand 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async commandHistory(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { deviceId } = req.query;
      const data = await DeviceControlService.getCommandHistory(
        deviceId ? +deviceId : undefined, +pageNum, +pageSize
      );
      return res.json(page(data.list, data.total, data.pageNum, data.pageSize));
    } catch (err: any) {
      logger.error(`[DeviceControl] commandHistory 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
