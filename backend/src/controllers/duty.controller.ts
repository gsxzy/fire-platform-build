import type { Request, Response } from 'express';
import { success, page } from '@/utils/response';
import { DutyService } from '@/services/duty.service';

export const DutyController = {
  // 排班
  async scheduleList(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const data = await DutyService.getSchedules(startDate as string, endDate as string);
    return res.json(success(data));
  },

  async scheduleCreate(req: Request, res: Response) {
    const schedule = await DutyService.createSchedule(req.body);
    return res.json(success({ id: (schedule as any).id }, '排班成功'));
  },

  // 签到
  async checkIn(req: Request, res: Response) {
    const log = await DutyService.checkIn(req.user!.userId, req.user!.username);
    return res.json(success({ id: (log as any).id }, '签到成功'));
  },

  // 签退（交接班）
  async checkOut(req: Request, res: Response) {
    const { handoverContent, incidents } = req.body;
    await DutyService.checkOut(req.user!.userId, handoverContent, incidents);
    return res.json(success(null, '签退成功'));
  },

  // 值班日志
  async logList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 20, userId } = req.query;
    const data = await DutyService.getDutyLogs(+pageNum, +pageSize, userId ? +userId : undefined);
    return res.json(page(data.list, data.total, data.pageNum, data.pageSize));
  },

  // 当前值班人员
  async currentDuty(req: Request, res: Response) {
    const data = await DutyService.getCurrentDuty();
    return res.json(success(data));
  },

  // 离岗预警
  async absenceAlert(req: Request, res: Response) {
    const data = await DutyService.checkAbsence();
    return res.json(success(data));
  },
};
