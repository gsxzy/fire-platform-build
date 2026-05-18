import type { Request, Response } from 'express';
import { sendSuccess, sendPage, sendFail } from '@/utils/respond';
import { AIService } from '@/services/ai.service';

export const AIController = {
  async overview(req: Request, res: Response) {
    const data = await AIService.overview();
    sendSuccess(res, req, data);
  },

  async executeDecision(req: Request, res: Response) {
    const { id } = req.params;
    const { user } = req as any;
    try {
      const result = await AIService.executeDecision(+id, user?.id, user?.real_name || user?.username);
      sendSuccess(res, req, result, '决策建议已执行');
    } catch (e: any) {
      sendFail(res, req, e.message || '执行失败', 400);
    }
  },

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
