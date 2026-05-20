import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/response';
import { DutyHandoverService } from '@/services/dutyHandover.service';
import { parseIdStrict, sanitizePagination } from '@/utils/validator';

export const DutyHandoverController = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { startTime, endTime, shiftId, fromUserId, toUserId, status } = req.query;
    const data = await DutyHandoverService.list({
      startTime: startTime as string,
      endTime: endTime as string,
      shiftId: shiftId as string,
      fromUserId: fromUserId ? String(fromUserId) : undefined,
      toUserId: toUserId ? String(toUserId) : undefined,
      status: status !== undefined ? +status : undefined,
      pageNum: +pageNum, pageSize: +pageSize,
    });
    sendPage(res, req, data.list, data.total, data.pageNum, data.pageSize);
  },

  async byId(req: Request, res: Response) {
    const row = await DutyHandoverService.byId(req.params.id);
    sendSuccess(res, req, row);
  },

  async create(req: Request, res: Response) {
    const row = await DutyHandoverService.create(req.body);
    sendSuccess(res, req, { id: (row as any).id }, '交接记录创建成功');
  },

  async accept(req: Request, res: Response) {
    const { toSignature } = req.body;
    await DutyHandoverService.accept(
      String(parseIdStrict(req.params.id)),
      req.user!.userId,
      req.user!.username,
      toSignature
    );
    sendSuccess(res, req, null, '交接确认成功');
  },

  async summary(req: Request, res: Response) {
    const { scheduleId } = req.query;
    const data = await DutyHandoverService.getHandoverSummary(scheduleId as string);
    sendSuccess(res, req, data);
  },
};
