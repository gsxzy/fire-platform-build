import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sendSuccess, sendPage } from '@/utils/respond';
import { MaintenanceCompany, MaintenanceContract, MaintenanceWorkOrder } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

function parsePage(req: Request) {
  const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
  return { pageNum, pageSize };
}

export const MaintenanceController = {
  async companyList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { keyword } = req.query;
    const where: Record<string, unknown> = {};
    if (keyword) where.company_name = { [Op.like]: `%${keyword}%` };
    const { count, rows } = await MaintenanceCompany.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async companyCreate(req: Request, res: Response) {
    const c = await MaintenanceCompany.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (c as any).id }, '创建成功');
  },

  async companyUpdate(req: Request, res: Response) {
    await MaintenanceCompany.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async companyDelete(req: Request, res: Response) {
    await MaintenanceCompany.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async contractList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { count, rows } = await MaintenanceContract.findAndCountAll({
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async contractCreate(req: Request, res: Response) {
    const c = await MaintenanceContract.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (c as any).id }, '创建成功');
  },

  async contractUpdate(req: Request, res: Response) {
    await MaintenanceContract.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async contractDelete(req: Request, res: Response) {
    await MaintenanceContract.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async workOrderList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { status, orderType, priority, keyword } = req.query;
    const where: Record<string, unknown> = {};
    if (status !== undefined) where.status = status;
    if (orderType) where.order_type = orderType;
    if (priority) where.priority = priority;
    if (keyword) {
      (where as { [Op.or]?: unknown })[Op.or] = [
        { order_no: { [Op.like]: `%${keyword}%` } },
        { device_name: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await MaintenanceWorkOrder.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async workOrderCreate(req: Request, res: Response) {
    const orderNo = `WO${Date.now()}${Math.floor(Math.random() * 100)}`;
    const wo = await MaintenanceWorkOrder.create({ ...sanitizeBody(req.body), order_no: orderNo } as any);
    sendSuccess(res, req, { id: (wo as any).id }, '创建成功');
  },

  async workOrderUpdate(req: Request, res: Response) {
    await MaintenanceWorkOrder.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async workOrderDelete(req: Request, res: Response) {
    await MaintenanceWorkOrder.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async workOrderAssign(req: Request, res: Response) {
    const { assigneeId, assigneeName, planStart, planEnd } = req.body;
    await MaintenanceWorkOrder.update(
      {
        assignee_id: assigneeId,
        assignee_name: assigneeName,
        plan_start: planStart,
        plan_end: planEnd,
        status: 1,
      },
      { where: { id: parseIdStrict(req.params.id) } }
    );
    sendSuccess(res, req, null, '派单成功');
  },

  async workOrderComplete(req: Request, res: Response) {
    const { handleResult, materialCost, laborCost } = req.body;
    await MaintenanceWorkOrder.update(
      {
        handle_result: handleResult,
        material_cost: materialCost,
        labor_cost: laborCost,
        actual_end: new Date(),
        status: 2,
      },
      { where: { id: parseIdStrict(req.params.id) } }
    );
    sendSuccess(res, req, null, '工单已完成');
  },

  async stats(req: Request, res: Response) {
    const [total, pending, processing, completed, todayCount] = await Promise.all([
      MaintenanceWorkOrder.count(),
      MaintenanceWorkOrder.count({ where: { status: 0 } }),
      MaintenanceWorkOrder.count({ where: { status: 1 } }),
      MaintenanceWorkOrder.count({ where: { status: 2 } }),
      MaintenanceWorkOrder.count({
        where: { created_at: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);
    sendSuccess(res, req, { total, pending, processing, completed, today: todayCount });
  },
};
