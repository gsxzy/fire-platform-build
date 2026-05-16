import type { Request, Response } from 'express';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { PatrolPlan, PatrolRecord, Hazard } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';

export const PatrolController = {
  /* ── 巡检计划 ── */
  async planList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { status } = req.query;
      const where: any = {};
      if (status !== undefined) where.status = status;
      const { count, rows } = await PatrolPlan.findAndCountAll({ where, limit: pageSize, offset: (pageNum - 1) * pageSize });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[PatrolController] planList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async planCreate(req: Request, res: Response) {
    try {
      const p = await PatrolPlan.create(sanitizeBody(req.body) as any);
      return res.json(success({ id: (p as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[PatrolController] planCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async planUpdate(req: Request, res: Response) {
    try {
      await PatrolPlan.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[PatrolController] planUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async planDelete(req: Request, res: Response) {
    try {
      await PatrolPlan.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[PatrolController] planDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 巡检记录 ── */
  async recordList(req: Request, res: Response) {
    try {
      const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
      const { count, rows } = await PatrolRecord.findAndCountAll({ limit: pageSize, offset: (pageNum - 1) * pageSize, order: [['created_at', 'DESC']] });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[PatrolController] recordList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async recordById(req: Request, res: Response) {
    try {
      const r = await PatrolRecord.findByPk(req.params.id);
      return res.json(success(r || null));
    } catch (err: any) {
      logger.error(`[PatrolController] recordById 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async recordCreate(req: Request, res: Response) {
    try {
      const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
      const r = await PatrolRecord.create({ ...sanitizeBody(req.body), patrol_no: patrolNo } as any);
      return res.json(success({ id: (r as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[PatrolController] recordCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async recordUpdate(req: Request, res: Response) {
    try {
      await PatrolRecord.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[PatrolController] recordUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async recordDelete(req: Request, res: Response) {
    try {
      await PatrolRecord.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[PatrolController] recordDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 隐患管理 ── */
  async hazardList(req: Request, res: Response) {
    try {
      const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
      const { status, level } = req.query;
      const where: any = {};
      if (status !== undefined) where.status = status;
      if (level) where.level = level;
      const { count, rows } = await Hazard.findAndCountAll({ where, limit: pageSize, offset: (pageNum - 1) * pageSize, order: [['created_at', 'DESC']] });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[PatrolController] hazardList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hazardCreate(req: Request, res: Response) {
    try {
      const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
      const h = await Hazard.create({ ...sanitizeBody(req.body), hazard_no: hazardNo } as any);
      return res.json(success({ id: (h as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[PatrolController] hazardCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hazardUpdate(req: Request, res: Response) {
    try {
      await Hazard.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[PatrolController] hazardUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hazardDelete(req: Request, res: Response) {
    try {
      await Hazard.destroy({ where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[PatrolController] hazardDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hazardRectify(req: Request, res: Response) {
    try {
      await Hazard.update({ status: 2, rectification_date: new Date() }, { where: { id: parseIdStrict(req.params.id) } });
      return res.json(success(null, '已整改'));
    } catch (err: any) {
      logger.error(`[PatrolController] hazardRectify 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
