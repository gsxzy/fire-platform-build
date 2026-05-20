import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/response';
import { PatrolPlan, PatrolRecord, Hazard, Alarm } from '@/models';
import { parseIdStrict } from '@/utils/validator';
import { makeListHandler, makeCreateHandler, makeUpdateHandler, makeDeleteHandler, makeDetailHandler } from '@/utils/controllerFactory';
import logger from '@/config/logger';

export const PatrolController = {
  planList: makeListHandler(PatrolPlan, {
    whereBuilder: (req) => {
      const where: Record<string, unknown> = {};
      const { status } = req.query;
      if (status !== undefined) where.status = status;
      return where;
    },
  }),
  planCreate: makeCreateHandler(PatrolPlan),
  planUpdate: makeUpdateHandler(PatrolPlan),
  planDelete: makeDeleteHandler(PatrolPlan),

  recordList: makeListHandler(PatrolRecord, { order: [['created_at', 'DESC']] }),
  recordById: makeDetailHandler(PatrolRecord),
  recordCreate: makeCreateHandler(PatrolRecord, {
    defaults: () => ({ patrol_no: `PT${Date.now()}${Math.floor(Math.random() * 100)}` }),
  }),
  recordUpdate: makeUpdateHandler(PatrolRecord),
  recordDelete: makeDeleteHandler(PatrolRecord),

  hazardList: makeListHandler(Hazard, {
    whereBuilder: (req) => {
      const { status, level } = req.query;
      const where: Record<string, unknown> = {};
      if (status !== undefined) where.status = status;
      if (level) where.level = level;
      return where;
    },
    order: [['created_at', 'DESC']],
  }),
  hazardCreate: makeCreateHandler(Hazard, {
    defaults: () => ({ hazard_no: `HZ${Date.now()}${Math.floor(Math.random() * 100)}` }),
  }),
  hazardUpdate: makeUpdateHandler(Hazard),
  hazardDelete: makeDeleteHandler(Hazard),

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
