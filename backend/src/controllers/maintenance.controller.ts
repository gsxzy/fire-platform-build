import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { MaintenanceCompany, MaintenanceContract, MaintenanceWorkOrder } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

export const MaintenanceController = {
  /* ── 维保单位 ── */
  async companyList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { keyword } = req.query;
      const where: any = {};
      if (keyword) where.company_name = { [Op.like]: `%${keyword}%` };
      const { count, rows } = await MaintenanceCompany.findAndCountAll({ where, limit: pageSize, offset: (pageNum - 1) * pageSize });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[MaintenanceController] companyList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async companyCreate(req: Request, res: Response) {
    try {
      const c = await MaintenanceCompany.create(sanitizeBody(req.body) as any);
      return res.json(success({ id: (c as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] companyCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async companyUpdate(req: Request, res: Response) {
    try {
      await MaintenanceCompany.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] companyUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async companyDelete(req: Request, res: Response) {
    try {
      await MaintenanceCompany.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] companyDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 维保合同 ── */
  async contractList(req: Request, res: Response) {
    try {
      const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
      const { count, rows } = await MaintenanceContract.findAndCountAll({ limit: pageSize, offset: (pageNum - 1) * pageSize });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[MaintenanceController] contractList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async contractCreate(req: Request, res: Response) {
    try {
      const c = await MaintenanceContract.create(sanitizeBody(req.body) as any);
      return res.json(success({ id: (c as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] contractCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async contractUpdate(req: Request, res: Response) {
    try {
      await MaintenanceContract.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] contractUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async contractDelete(req: Request, res: Response) {
    try {
      await MaintenanceContract.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] contractDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 维保工单 ── */
  async workOrderList(req: Request, res: Response) {
    try {
      const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
      const { status, orderType, priority, keyword } = req.query;
      const where: any = {};
      if (status !== undefined) where.status = status;
      if (orderType) where.order_type = orderType;
      if (priority) where.priority = priority;
      if (keyword) where[Op.or] = [{ order_no: { [Op.like]: `%${keyword}%` } }, { device_name: { [Op.like]: `%${keyword}%` } }];

      const { count, rows } = await MaintenanceWorkOrder.findAndCountAll({
        where, limit: pageSize, offset: (pageNum - 1) * pageSize,
        order: [['created_at', 'DESC']],
      });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[MaintenanceController] workOrderList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async workOrderCreate(req: Request, res: Response) {
    try {
      const orderNo = `WO${Date.now()}${Math.floor(Math.random() * 100)}`;
      const wo = await MaintenanceWorkOrder.create({ ...sanitizeBody(req.body), order_no: orderNo } as any);
      return res.json(success({ id: (wo as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] workOrderCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async workOrderUpdate(req: Request, res: Response) {
    try {
      await MaintenanceWorkOrder.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] workOrderUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async workOrderDelete(req: Request, res: Response) {
    try {
      await MaintenanceWorkOrder.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] workOrderDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async workOrderAssign(req: Request, res: Response) {
    try {
      const { assigneeId, assigneeName, planStart, planEnd } = req.body;
      await MaintenanceWorkOrder.update({
        assignee_id: assigneeId, assignee_name: assigneeName,
        plan_start: planStart, plan_end: planEnd, status: 1
      }, { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '派单成功'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] workOrderAssign 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async workOrderComplete(req: Request, res: Response) {
    try {
      const { handleResult, materialCost, laborCost } = req.body;
      await MaintenanceWorkOrder.update({
        handle_result: handleResult, material_cost: materialCost,
        labor_cost: laborCost, actual_end: new Date(), status: 2
      }, { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '工单已完成'));
    } catch (err: any) {
      logger.error(`[MaintenanceController] workOrderComplete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async stats(req: Request, res: Response) {
    try {
      const [total, pending, processing, completed, todayCount] = await Promise.all([
        MaintenanceWorkOrder.count(),
        MaintenanceWorkOrder.count({ where: { status: 0 } }),
        MaintenanceWorkOrder.count({ where: { status: 1 } }),
        MaintenanceWorkOrder.count({ where: { status: 2 } }),
        MaintenanceWorkOrder.count({ where: { created_at: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      ]);
      return res.json(success({ total, pending, processing, completed, today: todayCount }));
    } catch (err: any) {
      logger.error(`[MaintenanceController] stats 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
