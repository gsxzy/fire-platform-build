import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { PatrolPlan, PatrolRecord, Hazard, Alarm } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';
import logger from '@/config/logger';

function parsePage(req: Request) {
  const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
  return { pageNum, pageSize };
}

export const PatrolController = {
  async planList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { status } = req.query;
    const where: Record<string, unknown> = {};
    if (status !== undefined) where.status = status;
    const { count, rows } = await PatrolPlan.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async planCreate(req: Request, res: Response) {
    const p = await PatrolPlan.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (p as any).id }, '创建成功');
  },

  async planUpdate(req: Request, res: Response) {
    await PatrolPlan.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async planDelete(req: Request, res: Response) {
    await PatrolPlan.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async recordList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { count, rows } = await PatrolRecord.findAndCountAll({
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async recordById(req: Request, res: Response) {
    const r = await PatrolRecord.findByPk(req.params.id);
    sendSuccess(res, req, r || null);
  },

  async recordCreate(req: Request, res: Response) {
    const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
    const r = await PatrolRecord.create({ ...sanitizeBody(req.body), patrol_no: patrolNo } as any);
    sendSuccess(res, req, { id: (r as any).id }, '创建成功');
  },

  async recordUpdate(req: Request, res: Response) {
    await PatrolRecord.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async recordDelete(req: Request, res: Response) {
    await PatrolRecord.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async hazardList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { status, level } = req.query;
    const where: Record<string, unknown> = {};
    if (status !== undefined) where.status = status;
    if (level) where.level = level;
    const { count, rows } = await Hazard.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async hazardCreate(req: Request, res: Response) {
    const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
    const h = await Hazard.create({ ...sanitizeBody(req.body), hazard_no: hazardNo } as any);
    sendSuccess(res, req, { id: (h as any).id }, '创建成功');
  },

  async hazardUpdate(req: Request, res: Response) {
    await Hazard.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async hazardDelete(req: Request, res: Response) {
    await Hazard.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  async recordCheckIn(req: Request, res: Response) {
    const id = parseIdStrict(req.params.id);
    const { result, abnormalDesc, photos, signature, checkItems } = req.body;
    const updateBody: Record<string, unknown> = {
      result: result ?? 1,
      patrol_date: new Date(),
    };
    if (abnormalDesc !== undefined) updateBody.abnormal_desc = abnormalDesc;
    if (photos !== undefined) updateBody.photos = Array.isArray(photos) ? JSON.stringify(photos) : photos;
    if (signature !== undefined) updateBody.signature = signature;
    if (checkItems !== undefined) updateBody.patrol_items = Array.isArray(checkItems) ? JSON.stringify(checkItems) : checkItems;
    await PatrolRecord.update(updateBody, { where: { id } });

    const record = await PatrolRecord.findByPk(id) as any;
    if (result === 2 && record) {
      const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
      await Hazard.create({
        hazard_no: hazardNo,
        unit_id: record.unit_id,
        unit_name: record.unit_name,
        hazard_type: 4,
        description: abnormalDesc || `巡检异常：${record.patrol_no}`,
        level: 1,
        status: 0,
      } as any).catch((err: any) => logger.warn(`[Patrol] 自动创建隐患失败: ${err.message}`));
    }
    sendSuccess(res, req, null, '签到成功');
  },

  async hazardRectify(req: Request, res: Response) {
    const id = parseIdStrict(req.params.id);
    const hazard = await Hazard.findByPk(id) as any;
    await Hazard.update(
      { status: 2, rectification_date: new Date() },
      { where: { id } }
    );
    if (hazard && hazard.level >= 2) {
      const alarmNo = `ALM${Date.now()}${Math.floor(Math.random() * 100)}`;
      await Alarm.create({
        alarm_no: alarmNo,
        alarm_type: 3,
        alarm_level: hazard.level === 3 ? 3 : 2,
        unit_id: hazard.unit_id,
        unit_name: hazard.unit_name,
        alarm_desc: `隐患整改完成：${hazard.description}`,
        status: 2,
        handle_result: '隐患已整改',
      } as any).catch((err: any) => logger.warn(`[Patrol] 隐患整改联动告警失败: ${err.message}`));
    }
    sendSuccess(res, req, null, '已整改');
  },
};
