import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/response';
import { AIService } from '@/services/ai.service';

export const AIDecisionController = {
  async riskAnalysis(req: Request, res: Response) {
    const { scene, inputData } = req.body;
    const result = await AIService.riskAnalysis(scene, inputData);
    sendSuccess(res, req, result);
  },

  async filterFalseAlarm(req: Request, res: Response) {
    const { alarmId } = req.params;
    const result = await AIService.filterFalseAlarms(+alarmId);
    sendSuccess(res, req, result);
  },

  async situationAssessment(req: Request, res: Response) {
    const result = await AIService.situationAssessment();
    sendSuccess(res, req, result);
  },

  async generateSmartAlert(req: Request, res: Response) {
    const { deviceId } = req.body;
    const result = await AIService.generateSmartAlert(+deviceId);
    sendSuccess(res, req, result);
  },

  async trendAnalysis(req: Request, res: Response) {
    const days = parseInt(req.query.days as string) || 7;
    const result = await AIService.getTrend(days);
    sendSuccess(res, req, result);
  },
};
