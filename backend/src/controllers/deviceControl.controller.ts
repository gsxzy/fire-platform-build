import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/response';
import { sanitizePagination } from '@/utils/validator';
import { DeviceControlService } from '@/services/deviceControl.service';

export const DeviceControlController = {
  async sendCommand(req: Request, res: Response) {
    const { deviceId, cmdType, cmdParam, confirmToken } = req.body;
    const commandType = Number(cmdType);
    try {
      const confirm = await DeviceControlService.requireConfirmToken(commandType, confirmToken);
      if (confirm.needConfirm) {
        sendSuccess(res, req, { needConfirm: true, confirmToken: confirm.token }, '高危操作，请二次确认');
        return;
      }
    } catch (err: any) {
      sendSuccess(res, req, { success: false, message: err.message }, err.message);
      return;
    }
    const result = await DeviceControlService.sendCommand({
      deviceId: Number(deviceId),
      commandType,
      params: cmdParam ?? {},
      operatorId: req.user!.userId,
      operatorName: req.user!.username,
    });
    sendSuccess(res, req, result, result.message);
  },

  async remoteStartStop(req: Request, res: Response) {
    const { deviceId, action, confirmToken } = req.body;
    const commandType = action === 'start' ? 1 : 2;
    try {
      const confirm = await DeviceControlService.requireConfirmToken(commandType, confirmToken);
      if (confirm.needConfirm) {
        sendSuccess(res, req, { needConfirm: true, confirmToken: confirm.token }, '高危操作，请二次确认');
        return;
      }
    } catch (err: any) {
      sendSuccess(res, req, { success: false, message: err.message }, err.message);
      return;
    }
    const result = await DeviceControlService.remoteStartStop(
      deviceId,
      action,
      req.user!.userId,
      req.user!.username
    );
    sendSuccess(res, req, result);
  },

  async remoteReset(req: Request, res: Response) {
    const { deviceId, confirmToken } = req.body;
    try {
      const confirm = await DeviceControlService.requireConfirmToken(3, confirmToken);
      if (confirm.needConfirm) {
        sendSuccess(res, req, { needConfirm: true, confirmToken: confirm.token }, '复位为高危操作，请二次确认');
        return;
      }
    } catch (err: any) {
      sendSuccess(res, req, { success: false, message: err.message }, err.message);
      return;
    }
    const result = await DeviceControlService.remoteReset(deviceId, req.user!.userId, req.user!.username);
    sendSuccess(res, req, result);
  },

  async silence(req: Request, res: Response) {
    const { deviceId, confirmToken } = req.body;
    try {
      const confirm = await DeviceControlService.requireConfirmToken(4, confirmToken);
      if (confirm.needConfirm) {
        sendSuccess(res, req, { needConfirm: true, confirmToken: confirm.token }, '消音为高危操作，请二次确认');
        return;
      }
    } catch (err: any) {
      sendSuccess(res, req, { success: false, message: err.message }, err.message);
      return;
    }
    const result = await DeviceControlService.silence(deviceId, req.user!.userId, req.user!.username);
    sendSuccess(res, req, result);
  },

  async batchCommand(req: Request, res: Response) {
    const { deviceIds, cmdType, param, confirmToken } = req.body;
    const commandType = Number(cmdType);
    try {
      const confirm = await DeviceControlService.requireConfirmToken(commandType, confirmToken);
      if (confirm.needConfirm) {
        sendSuccess(res, req, { needConfirm: true, confirmToken: confirm.token }, '批量控制为高危操作，请二次确认');
        return;
      }
    } catch (err: any) {
      sendSuccess(res, req, { success: false, message: err.message }, err.message);
      return;
    }
    const ids = Array.isArray(deviceIds) ? deviceIds.map((id: unknown) => Number(id)) : [];
    const result = await DeviceControlService.batchControl(
      ids,
      commandType,
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
