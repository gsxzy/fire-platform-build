import type { Request, Response } from 'express';
import { success, page } from '@/utils/response';
import { TrainingCourse, TrainingExam } from '@/models';

export const TrainingController = {
  async courseList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10 } = req.query;
    const { count, rows } = await TrainingCourse.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async courseCreate(req: Request, res: Response) {
    const c = await TrainingCourse.create(req.body as any);
    return res.json(success({ id: (c as any).id }, '创建成功'));
  },
  async courseUpdate(req: Request, res: Response) {
    await TrainingCourse.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async courseDelete(req: Request, res: Response) {
    await TrainingCourse.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  async examList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10 } = req.query;
    const { count, rows } = await TrainingExam.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async examCreate(req: Request, res: Response) {
    const e = await TrainingExam.create(req.body as any);
    return res.json(success({ id: (e as any).id }, '创建成功'));
  },
};
