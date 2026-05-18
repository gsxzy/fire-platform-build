/**
 * workbench.controller.ts — 工作台控制器（待办 + 公告）
 */
import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { WorkbenchTodoService, WorkbenchNoticeService } from '@/services/workbench.service';

/* ── 待办 ── */

export const WorkbenchTodoController = {
  async list(req: Request, res: Response) {
    const q = req.query as any;
    const data = await WorkbenchTodoService.list({
      status: q.status !== undefined ? Number(q.status) : undefined,
      userId: q.userId as string,
      keyword: q.keyword as string,
      page: q.page ? Number(q.page) : 1,
      pageSize: q.pageSize ? Number(q.pageSize) : 20,
    });
    sendPage(res, req, data.list as any[], data.total, data.page, data.pageSize);
  },

  async create(req: Request, res: Response) {
    const row = await WorkbenchTodoService.create(req.body);
    sendSuccess(res, req, row, '创建成功');
  },

  async update(req: Request, res: Response) {
    const row = await WorkbenchTodoService.update(Number(req.params.id), req.body);
    sendSuccess(res, req, row, '更新成功');
  },

  async delete(req: Request, res: Response) {
    await WorkbenchTodoService.delete(Number(req.params.id));
    sendSuccess(res, req, null, '删除成功');
  },

  async byId(req: Request, res: Response) {
    const row = await WorkbenchTodoService.byId(Number(req.params.id));
    sendSuccess(res, req, row);
  },

  async pendingCount(req: Request, res: Response) {
    const count = await WorkbenchTodoService.countPending(req.query.userId as string);
    sendSuccess(res, req, { count });
  },
};

/* ── 公告 ── */

export const WorkbenchNoticeController = {
  async list(req: Request, res: Response) {
    const q = req.query as any;
    const data = await WorkbenchNoticeService.list({
      type: q.type as string,
      status: q.status !== undefined ? Number(q.status) : undefined,
      keyword: q.keyword as string,
      page: q.page ? Number(q.page) : 1,
      pageSize: q.pageSize ? Number(q.pageSize) : 20,
    });
    sendPage(res, req, data.list as any[], data.total, data.page, data.pageSize);
  },

  async create(req: Request, res: Response) {
    const row = await WorkbenchNoticeService.create(req.body);
    sendSuccess(res, req, row, '创建成功');
  },

  async update(req: Request, res: Response) {
    const row = await WorkbenchNoticeService.update(Number(req.params.id), req.body);
    sendSuccess(res, req, row, '更新成功');
  },

  async delete(req: Request, res: Response) {
    await WorkbenchNoticeService.delete(Number(req.params.id));
    sendSuccess(res, req, null, '删除成功');
  },

  async byId(req: Request, res: Response) {
    const row = await WorkbenchNoticeService.byId(Number(req.params.id));
    sendSuccess(res, req, row);
  },
};
