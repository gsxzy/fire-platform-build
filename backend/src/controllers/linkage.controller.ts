import type { Request, Response } from 'express';
import { success, fail } from '@/utils/response';
import { LinkageRule } from '@/models';
import { LinkageService } from '@/services/linkage.service';

export const LinkageController = {
  /**
   * 获取联动规则列表
   */
  async list(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, status } = req.query;
    const where: any = {};
    if (status !== undefined) where.status = status;

    const { count, rows } = await LinkageRule.findAndCountAll({
      where,
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      order: [['id', 'DESC']],
    });

    return res.json(success({ list: rows, total: count }));
  },

  /**
   * 创建联动规则
   */
  async create(req: Request, res: Response) {
    try {
      const rule = await LinkageRule.create({
        ...req.body,
        status: 1
      } as any);

      return res.json(success(rule, '联动规则创建成功'));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 更新联动规则
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const rule = await LinkageRule.findByPk(id);
      if (!rule) {
        return res.json(fail('联动规则不存在'));
      }

      await rule.update(req.body);
      return res.json(success(rule, '联动规则更新成功'));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 删除联动规则
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const rule = await LinkageRule.findByPk(id);
      if (!rule) {
        return res.json(fail('联动规则不存在'));
      }

      await rule.destroy();
      return res.json(success(null, '联动规则删除成功'));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 手动触发联动
   */
  async manualTrigger(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const plan = await LinkageService.manualTrigger(
        +ruleId,
        req.user!.userId,
        req.user!.username
      );

      if (!plan) {
        return res.json(fail('联动触发失败'));
      }

      return res.json(success(plan, '联动已触发'));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 获取联动状态
   */
  async getStatus(req: Request, res: Response) {
    try {
      const { alarmId } = req.params;
      const status = await LinkageService.getLinkageStatus(+alarmId);

      if (!status) {
        return res.json(fail('联动不存在'));
      }

      return res.json(success(status));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 应用预设联动方案
   */
  async applyPreset(req: Request, res: Response) {
    try {
      const { planType, deviceIds } = req.body;

      const validTypes = ['fireAlarm', 'falseAlarm', 'drill'];
      if (!validTypes.includes(planType)) {
        return res.json(fail('无效的联动方案类型'));
      }

      await LinkageService.applyPresetPlan(
        planType,
        deviceIds,
        req.user!.userId,
        req.user!.username
      );

      return res.json(success(null, '联动方案已应用'));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 获取联动记录
   */
  async getRecords(req: Request, res: Response) {
    try {
      const { pageNum = 1, pageSize = 10, alarmId } = req.query;
      const where: any = {};
      if (alarmId) where.alarm_id = alarmId;

      // 这里应该有联动记录表，暂时返回空
      const records: unknown[] = [];

      return res.json(success({ list: records, total: 0 }));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  }
};