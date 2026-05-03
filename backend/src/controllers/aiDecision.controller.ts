import type { Request, Response } from 'express';
import { success, page } from '@/utils/response';
import { AIService } from '@/services/ai.service';

export const AIDecisionController = {
  // AI风险研判
  async riskAnalysis(req: Request, res: Response) {
    const { scene, inputData } = req.body;
    const result = await AIService.riskAnalysis(scene, inputData);
    return res.json(success(result));
  },

  // 误报过滤
  async filterFalseAlarm(req: Request, res: Response) {
    const { alarmId } = req.params;
    const result = await AIService.filterFalseAlarms(+alarmId);
    return res.json(success(result));
  },

  // 态势研判
  async situationAssessment(req: Request, res: Response) {
    const result = await AIService.situationAssessment();
    return res.json(success(result));
  },

  // 生成智能预警
  async generateSmartAlert(req: Request, res: Response) {
    const { deviceId } = req.body;
    const result = await AIService.generateSmartAlert(+deviceId);
    return res.json(success(result));
  },

  // 趋势分析
  async trendAnalysis(req: Request, res: Response) {
    const days = parseInt(req.query.days as string) || 7;
    const result = await AIService.getTrend(days);
    return res.json(success(result));
  },
};
