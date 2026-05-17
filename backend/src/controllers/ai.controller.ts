import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { AIService } from '@/services/ai.service';

export const AIController = {
  async decisionList(req: Request, res: Response) {
    const { rows, count, pageNum, pageSize } = await AIService.decisionList(req);
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async decisionCreate(req: Request, res: Response) {
    const result = await AIService.decisionCreate(req.body);
    sendSuccess(res, req, { id: result.id }, '分析完成');
  },

  async alertList(req: Request, res: Response) {
    const { rows, count, pageNum, pageSize } = await AIService.alertList(req);
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async alertConfirm(req: Request, res: Response) {
    await AIService.alertConfirm(req.params.id);
    sendSuccess(res, req, null, '已确认');
  },

  async alertHandle(req: Request, res: Response) {
    await AIService.alertHandle(req.params.id);
    sendSuccess(res, req, null, '已处理');
  },
};
