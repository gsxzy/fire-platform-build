import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/response';
import { HttpError } from '@/utils/httpError';
import { LinkageRule } from '@/models';
import { LinkageService } from '@/services/linkage.service';
import { sanitizePagination } from '@/utils/validator';

export const LinkageController = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { status } = req.query;
    const where: Record<string, unknown> = {};
    if (status !== undefined) where.status = status;

    const { count, rows } = await LinkageRule.findAndCountAll({
      where,
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      order: [['id', 'DESC']],
    });

    sendSuccess(res, req, { list: rows, total: count });
  },

  async create(req: Request, res: Response) {
    const body = req.body as Record<string, unknown>;
    const status = body.status !== undefined && body.status !== null ? body.status : 1;
    const rule = await LinkageRule.create({ ...body, status } as any);
    sendSuccess(res, req, rule, '联动规则创建成功');
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const rule = await LinkageRule.findByPk(id);
    if (!rule) throw new HttpError('联动规则不存在', 404);

    await rule.update(req.body);
    sendSuccess(res, req, rule, '联动规则更新成功');
  },

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const rule = await LinkageRule.findByPk(id);
    if (!rule) throw new HttpError('联动规则不存在', 404);

    await rule.destroy();
    sendSuccess(res, req, null, '联动规则删除成功');
  },

  async manualTrigger(req: Request, res: Response) {
    const id = req.params.id ?? (req.params as { ruleId?: string }).ruleId;
    const plan = await LinkageService.manualTrigger(+id, req.user!.userId, req.user!.username);

    if (!plan) throw new HttpError('联动触发失败', 400);
    sendSuccess(res, req, plan, '联动已触发');
  },

  async getStatus(req: Request, res: Response) {
    const { alarmId } = req.params;
    const status = await LinkageService.getLinkageStatus(+alarmId);
    if (!status) throw new HttpError('联动不存在', 404);
    sendSuccess(res, req, status);
  },

  async applyPreset(req: Request, res: Response) {
    const { planType, deviceIds } = req.body;
    const validTypes = ['fireAlarm', 'falseAlarm', 'drill'];
    if (!validTypes.includes(planType)) {
      throw new HttpError('无效的联动方案类型', 400);
    }

    await LinkageService.applyPresetPlan(planType, deviceIds, req.user!.userId, req.user!.username);
    sendSuccess(res, req, null, '联动方案已应用');
  },

  async getRecords(req: Request, res: Response) {
    sendSuccess(res, req, { list: [] as unknown[], total: 0 });
  },
};
