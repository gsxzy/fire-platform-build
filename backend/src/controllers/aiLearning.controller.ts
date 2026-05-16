import type { Request, Response } from 'express';
import { success, page, fail } from '@/utils/response';
import logger from '@/config/logger';
import { AILearningService } from '@/services/aiLearning.service';
import { sanitizePagination } from '@/utils/validator';

export const AILearningController = {
  /**
   * 记录故障事件
   */
  async record(req: Request, res: Response) {
    try {
      const { deviceId, deviceName, issueType, symptoms, rootCause, solution, status, sourceIp, resolvedBy } = req.body;
      const record = await AILearningService.recordIssue({
        deviceId,
        deviceName,
        issueType,
        symptoms,
        rootCause,
        solution,
        status,
        sourceIp,
        resolvedBy,
      });
      return res.json(success(record, '故障记录已保存'));
    } catch (err: any) {
      logger.error(`[AILearning] record 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /**
   * 智能诊断查询
   */
  async diagnose(req: Request, res: Response) {
    try {
      const { deviceId, symptoms } = req.query;
      const result = await AILearningService.diagnose(String(deviceId || ''), symptoms ? String(symptoms) : undefined);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[AILearning] diagnose 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /**
   * 故障统计（按类型）
   */
  async statsByType(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await AILearningService.statsByType(limit);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[AILearning] statsByType 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /**
   * 故障统计（按设备）
   */
  async statsByDevice(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await AILearningService.statsByDevice(limit);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[AILearning] statsByDevice 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /**
   * 更新故障记录
   */
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const record = await AILearningService.updateIssue(id, req.body);
      if (!record) return res.json(success(null, '记录不存在'));
      return res.json(success(record, '更新成功'));
    } catch (err: any) {
      logger.error(`[AILearning] update 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /**
   * 故障记录列表
   */
  async list(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { deviceId, issueType  } = req.query;
      const where: any = {};
      if (deviceId) where.device_id = deviceId;
      if (issueType) where.issue_type = issueType;

      const { IssueHistory } = await import('@/models');
      const { count, rows } = await IssueHistory.findAndCountAll({
        where,
        limit: +pageSize,
        offset: (+pageNum - 1) * +pageSize,
        order: [['created_at', 'DESC']],
      });

      return res.json(page(rows, count, +pageNum, +pageSize));
    } catch (err: any) {
      logger.error(`[AILearning] list 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
