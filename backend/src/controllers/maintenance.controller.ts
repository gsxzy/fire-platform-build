import type { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize';
import { success, page } from '@/utils/response';
import { MaintenanceCompany, MaintenanceContract, MaintenanceWorkOrder, Device, Unit } from '@/models';

export const MaintenanceController = {
  /* ── 维保单位 ── */
  async companyList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, keyword } = req.query;
    const where: any = {};
    if (keyword) where.company_name = { [Op.like]: `%${keyword}%` };
    const { count, rows } = await MaintenanceCompany.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async companyCreate(req: Request, res: Response) {
    const c = await MaintenanceCompany.create(req.body as any);
    return res.json(success({ id: (c as any).id }, '创建成功'));
  },
  async companyUpdate(req: Request, res: Response) {
    await MaintenanceCompany.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async companyDelete(req: Request, res: Response) {
    await MaintenanceCompany.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  /* ── 维保合同 ── */
  async contractList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10 } = req.query;
    const { count, rows } = await MaintenanceContract.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async contractCreate(req: Request, res: Response) {
    const c = await MaintenanceContract.create(req.body as any);
    return res.json(success({ id: (c as any).id }, '创建成功'));
  },
  async contractUpdate(req: Request, res: Response) {
    await MaintenanceContract.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async contractDelete(req: Request, res: Response) {
    await MaintenanceContract.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  /* ── 维保工单 ── */
  async workOrderList(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, status, orderType, priority, keyword } = req.query;
    const where: any = {};
    if (status !== undefined) where.status = status;
    if (orderType) where.order_type = orderType;
    if (priority) where.priority = priority;
    if (keyword) where[Op.or] = [{ order_no: { [Op.like]: `%${keyword}%` } }, { device_name: { [Op.like]: `%${keyword}%` } }];

    const { count, rows } = await MaintenanceWorkOrder.findAndCountAll({
      where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },
  async workOrderCreate(req: Request, res: Response) {
    const orderNo = `WO${Date.now()}${Math.floor(Math.random() * 100)}`;
    const wo = await MaintenanceWorkOrder.create({ ...req.body, order_no: orderNo } as any);
    return res.json(success({ id: (wo as any).id }, '创建成功'));
  },
  async workOrderUpdate(req: Request, res: Response) {
    await MaintenanceWorkOrder.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },
  async workOrderDelete(req: Request, res: Response) {
    await MaintenanceWorkOrder.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },
  async workOrderAssign(req: Request, res: Response) {
    const { assigneeId, assigneeName, planStart, planEnd } = req.body;
    await MaintenanceWorkOrder.update({
      assignee_id: assigneeId, assignee_name: assigneeName,
      plan_start: planStart, plan_end: planEnd, status: 1
    }, { where: { id: req.params.id } });
    return res.json(success(null, '派单成功'));
  },
  async workOrderComplete(req: Request, res: Response) {
    const { handleResult, materialCost, laborCost } = req.body;
    await MaintenanceWorkOrder.update({
      handle_result: handleResult, material_cost: materialCost,
      labor_cost: laborCost, actual_end: new Date(), status: 2
    }, { where: { id: req.params.id } });
    return res.json(success(null, '工单已完成'));
  },
  async stats(req: Request, res: Response) {
    const [total, pending, processing, completed, todayCount] = await Promise.all([
      MaintenanceWorkOrder.count(),
      MaintenanceWorkOrder.count({ where: { status: 0 } }),
      MaintenanceWorkOrder.count({ where: { status: 1 } }),
      MaintenanceWorkOrder.count({ where: { status: 2 } }),
      MaintenanceWorkOrder.count({ where: { created_at: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);
    return res.json(success({ total, pending, processing, completed, today: todayCount }));
  },
};
