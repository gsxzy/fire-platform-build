import type { Request, Response } from 'express';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { TrainingCourse, TrainingExam } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

export const TrainingController = {
  async courseList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { count, rows } = await TrainingCourse.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
      return res.json(page(rows, count, +pageNum, +pageSize));
    } catch (err: any) {
      logger.error(`[TrainingController] courseList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async courseCreate(req: Request, res: Response) {
    try {
      const c = await TrainingCourse.create(sanitizeBody(req.body) as any);
      return res.json(success({ id: (c as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[TrainingController] courseCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async courseUpdate(req: Request, res: Response) {
    try {
      await TrainingCourse.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[TrainingController] courseUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async courseDelete(req: Request, res: Response) {
    try {
      await TrainingCourse.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[TrainingController] courseDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async examList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { count, rows } = await TrainingExam.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
      return res.json(page(rows, count, +pageNum, +pageSize));
    } catch (err: any) {
      logger.error(`[TrainingController] examList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async examCreate(req: Request, res: Response) {
    try {
      const e = await TrainingExam.create(sanitizeBody(req.body) as any);
      return res.json(success({ id: (e as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[TrainingController] examCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
