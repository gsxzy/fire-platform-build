import type { Request, Response } from 'express';
import { sendSuccess, sendDeleted, sendPage } from '@/utils/response';
import { DutyShiftService } from '@/services/dutyShift.service';
import { parseIdStrict, sanitizePagination } from '@/utils/validator';

export const DutyShiftController = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { keyword, status } = req.query;
    const data = await DutyShiftService.list(
      keyword as string,
      status !== undefined ? +status : undefined,
      +pageNum, +pageSize
    );
    sendPage(res, req, data.list, data.total, data.pageNum, data.pageSize);
  },

  async byId(req: Request, res: Response) {
    const row = await DutyShiftService.byId(req.params.id);
    sendSuccess(res, req, row);
  },

  async create(req: Request, res: Response) {
    const row = await DutyShiftService.create(req.body);
    sendSuccess(res, req, { id: (row as any).id }, '创建成功');
  },

  async update(req: Request, res: Response) {
    await DutyShiftService.update(String(parseIdStrict(req.params.id)), req.body);
    sendSuccess(res, req, null, '更新成功');
  },

  async delete(req: Request, res: Response) {
    await DutyShiftService.delete(String(parseIdStrict(req.params.id)));
    sendDeleted(res, req);
  },

  async toggleStatus(req: Request, res: Response) {
    const { status } = req.body;
    await DutyShiftService.toggleStatus(String(parseIdStrict(req.params.id)), +status);
    sendSuccess(res, req, null, '状态更新成功');
  },
};
