import type { Request, Response } from 'express';
import { sendSuccess, sendDeleted, sendPage } from '@/utils/respond';
import { DutyService } from '@/services/duty.service';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

export const DutyController = {
  async scheduleList(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const pageNum = parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1;
    const pageSize = parseInt(String(req.query.pageSize ?? 10), 10) || 10;
    const data = await DutyService.getSchedules(startDate as string, endDate as string, pageNum, pageSize);
    sendPage(res, req, data.list, data.total, data.pageNum, data.pageSize);
  },

  async scheduleById(req: Request, res: Response) {
    const schedule = await DutyService.getScheduleById(req.params.id);
    sendSuccess(res, req, schedule || null);
  },

  async scheduleCreate(req: Request, res: Response) {
    const schedule = await DutyService.createSchedule(sanitizeBody(req.body));
    sendSuccess(res, req, { id: (schedule as any).id }, '排班成功');
  },

  async scheduleUpdate(req: Request, res: Response) {
    await DutyService.updateSchedule(String(parseIdStrict(req.params.id)), sanitizeBody(req.body));
    sendSuccess(res, req, null, '更新成功');
  },

  async scheduleDelete(req: Request, res: Response) {
    await DutyService.deleteSchedule(String(parseIdStrict(req.params.id)));
    sendDeleted(res, req);
  },

  async checkIn(req: Request, res: Response) {
    const log = await DutyService.checkIn(req.user!.userId, req.user!.username);
    sendSuccess(res, req, { id: (log as any).id }, '签到成功');
  },

  async checkOut(req: Request, res: Response) {
    const { handoverContent, incidents } = req.body;
    await DutyService.checkOut(req.user!.userId, handoverContent, incidents);
    sendSuccess(res, req, null, '签退成功');
  },

  async logList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { userId } = req.query;
    const data = await DutyService.getDutyLogs(+pageNum, +pageSize, userId ? +userId : undefined);
    sendPage(res, req, data.list, data.total, data.pageNum, data.pageSize);
  },

  async currentDuty(req: Request, res: Response) {
    const data = await DutyService.getCurrentDuty();
    sendSuccess(res, req, data);
  },

  async absenceAlert(req: Request, res: Response) {
    const data = await DutyService.checkAbsence();
    sendSuccess(res, req, data);
  },
};
