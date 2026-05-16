import type { Request, Response } from 'express';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { DutyService } from '@/services/duty.service';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

export const DutyController = {
  // 排班
  async scheduleList(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const pageNum = parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1;
      const pageSize = parseInt(String(req.query.pageSize ?? 10), 10) || 10;
      const data = await DutyService.getSchedules(startDate as string, endDate as string, pageNum, pageSize);
      return res.json(page(data.list, data.total, data.pageNum, data.pageSize));
    } catch (err: any) {
      logger.error(`[DutyController] scheduleList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async scheduleById(req: Request, res: Response) {
    try {
      const schedule = await DutyService.getScheduleById(req.params.id);
      return res.json(success(schedule || null));
    } catch (err: any) {
      logger.error(`[DutyController] scheduleById 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async scheduleCreate(req: Request, res: Response) {
    try {
      const schedule = await DutyService.createSchedule(sanitizeBody(req.body));
      return res.json(success({ id: (schedule as any).id }, '排班成功'));
    } catch (err: any) {
      logger.error(`[DutyController] scheduleCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async scheduleUpdate(req: Request, res: Response) {
    try {
      await DutyService.updateSchedule(String(parseIdStrict(req.params.id)), sanitizeBody(req.body));
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[DutyController] scheduleUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async scheduleDelete(req: Request, res: Response) {
    try {
      await DutyService.deleteSchedule(String(parseIdStrict(req.params.id)));
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[DutyController] scheduleDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 签到
  async checkIn(req: Request, res: Response) {
    try {
      const log = await DutyService.checkIn(req.user!.userId, req.user!.username);
      return res.json(success({ id: (log as any).id }, '签到成功'));
    } catch (err: any) {
      logger.error(`[DutyController] checkIn 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 签退（交接班）
  async checkOut(req: Request, res: Response) {
    try {
      const { handoverContent, incidents } = req.body;
      await DutyService.checkOut(req.user!.userId, handoverContent, incidents);
      return res.json(success(null, '签退成功'));
    } catch (err: any) {
      logger.error(`[DutyController] checkOut 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 值班日志
  async logList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { userId  } = req.query;
      const data = await DutyService.getDutyLogs(+pageNum, +pageSize, userId ? +userId : undefined);
      return res.json(page(data.list, data.total, data.pageNum, data.pageSize));
    } catch (err: any) {
      logger.error(`[DutyController] logList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 当前值班人员
  async currentDuty(req: Request, res: Response) {
    try {
      const data = await DutyService.getCurrentDuty();
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[DutyController] currentDuty 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 离岗预警
  async absenceAlert(req: Request, res: Response) {
    try {
      const data = await DutyService.checkAbsence();
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[DutyController] absenceAlert 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
