import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/response';
import { AILearningService } from '@/services/aiLearning.service';
import { sanitizePagination } from '@/utils/validator';

export const AILearningController = {
  async record(req: Request, res: Response) {
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
    sendSuccess(res, req, record, '故障记录已保存');
  },

  async diagnose(req: Request, res: Response) {
    const { deviceId, symptoms } = req.query;
    const result = await AILearningService.diagnose(
      String(deviceId || ''),
      symptoms ? String(symptoms) : undefined
    );
    sendSuccess(res, req, result);
  },

  async statsByType(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await AILearningService.statsByType(limit);
    sendSuccess(res, req, data);
  },

  async statsByDevice(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await AILearningService.statsByDevice(limit);
    sendSuccess(res, req, data);
  },

  async update(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const record = await AILearningService.updateIssue(id, req.body);
    if (!record) {
      sendSuccess(res, req, null, '记录不存在');
      return;
    }
    sendSuccess(res, req, record, '更新成功');
  },

  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { deviceId, issueType } = req.query;
    const where: Record<string, unknown> = {};
    if (deviceId) where.device_id = deviceId;
    if (issueType) where.issue_type = issueType;

    const { IssueHistory } = await import('@/models');
    const { count, rows } = await IssueHistory.findAndCountAll({
      where,
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });

    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },
};
