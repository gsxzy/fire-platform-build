import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { TrainingCourse, TrainingExam } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

export const TrainingController = {
  async courseList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { count, rows } = await TrainingCourse.findAndCountAll({
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async courseCreate(req: Request, res: Response) {
    const c = await TrainingCourse.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (c as any).id }, '创建成功');
  },

  async courseUpdate(req: Request, res: Response) {
    await TrainingCourse.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async courseDelete(req: Request, res: Response) {
    await TrainingCourse.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async examList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { count, rows } = await TrainingExam.findAndCountAll({
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async examCreate(req: Request, res: Response) {
    const e = await TrainingExam.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (e as any).id }, '创建成功');
  },
};
