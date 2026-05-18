import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sendSuccess, sendPage } from '@/utils/respond';
import { MaintenanceCompany, MaintenanceContract, MaintenanceWorkOrder, MaintenanceRecord } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';
import logger from '@/config/logger';

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
    const orderId = parseIdStrict(req.params.id);
    await MaintenanceWorkOrder.update(
      {
        handle_result: handleResult,
        material_cost: materialCost,
        labor_cost: laborCost,
        actual_end: new Date(),
        status: 2,
      },
      { where: { id: orderId } }
    );

    // 工单完工自动写维保记录（P1）
    try {
      const wo = await MaintenanceWorkOrder.findByPk(orderId, { raw: true }) as any;
      if (wo) {
        const typeMap: Record<number, string> = { 1: 'inspection', 2: 'repair', 3: 'maintenance', 4: 'replacement' };
        await MaintenanceRecord.create({
          record_no: `MR${Date.now()}${Math.floor(Math.random() * 100)}`,
          work_order_id: orderId,
          device_id: wo.device_id,
          device_name: wo.device_name,
          unit_id: wo.unit_id,
          unit_name: wo.unit_name,
          record_type: typeMap[wo.order_type] || 'maintenance',
          content: wo.fault_desc,
          result: handleResult,
          staff_name: wo.assignee_name,
          record_date: new Date().toISOString().slice(0, 10),
          status: 1,
          material_cost: materialCost,
          labor_cost: laborCost,
        } as any);
      }
    } catch (e: any) {
      // 自动写记录失败不影响工单完成主流程
      logger.warn(`[Maintenance] 工单 ${orderId} 完工后自动写维保记录失败: ${e.message}`);
    }

    sendSuccess(res, req, null, '工单已完成');
  },

  async recordList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { keyword, recordType, status } = req.query;
    const where: Record<string, unknown> = {};
    if (recordType) where.record_type = recordType;
    if (status !== undefined) where.status = status;
    if (keyword) {
      (where as { [Op.or]?: unknown })[Op.or] = [
        { record_no: { [Op.like]: `%${keyword}%` } },
        { device_name: { [Op.like]: `%${keyword}%` } },
      ];
    }
    const { count, rows } = await MaintenanceRecord.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['record_date', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async recordCreate(req: Request, res: Response) {
    const recordNo = `MR${Date.now()}${Math.floor(Math.random() * 100)}`;
    const r = await MaintenanceRecord.create({ ...sanitizeBody(req.body), record_no: recordNo } as any);
    sendSuccess(res, req, { id: (r as any).id }, '创建成功');
  },

  async recordUpdate(req: Request, res: Response) {
    await MaintenanceRecord.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async recordDelete(req: Request, res: Response) {
    await MaintenanceRecord.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
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
