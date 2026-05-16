import type { Request, Response } from 'express';
import { success, fail } from '@/utils/response';
import logger from '@/config/logger';
import { AIService } from '@/services/ai.service';

export const AIDecisionController = {
  // AI风险研判
  async riskAnalysis(req: Request, res: Response) {
    try {
      const { scene, inputData } = req.body;
      const result = await AIService.riskAnalysis(scene, inputData);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[AIDecision] riskAnalysis 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 误报过滤
  async filterFalseAlarm(req: Request, res: Response) {
    try {
      const { alarmId } = req.params;
      const result = await AIService.filterFalseAlarms(+alarmId);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[AIDecision] filterFalseAlarm 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 态势研判
  async situationAssessment(req: Request, res: Response) {
    try {
      const result = await AIService.situationAssessment();
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[AIDecision] situationAssessment 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 生成智能预警
  async generateSmartAlert(req: Request, res: Response) {
    try {
      const { deviceId } = req.body;
      const result = await AIService.generateSmartAlert(+deviceId);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[AIDecision] generateSmartAlert 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 趋势分析
  async trendAnalysis(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const result = await AIService.getTrend(days);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[AIDecision] trendAnalysis 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
