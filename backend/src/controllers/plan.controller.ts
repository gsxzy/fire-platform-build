import type { Request, Response } from 'express';
import { sendSuccess, sendDeleted, sendPage } from '@/utils/respond';
import { EmergencyPlan, EmergencyDrill, DrillParticipant } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';


function parsePage(req: Request) {
  const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
  return { pageNum, pageSize };
}

function mapPlanBody(body: Record<string, unknown>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (body.name !== undefined) m.plan_name = body.name;
  if (body.type !== undefined) m.plan_type = body.type;
  if (body.level !== undefined) m.plan_level = body.level;
  if (body.version !== undefined) m.version_no = body.version;
  if (body.unitId !== undefined) m.unit_id = body.unitId;
  if (body.unitName !== undefined) m.unit_name = body.unitName;
  if (body.applicableScene !== undefined) m.applicable_scene = body.applicableScene;
  if (body.content !== undefined) m.content = body.content;
  if (body.fileUrl !== undefined) m.file_url = body.fileUrl;
  if (body.updateDate !== undefined) m.update_date = body.updateDate;
  if (body.status !== undefined) m.status = body.status;
  return { ...sanitizeBody(body), ...m };
}

function mapDrillBody(body: Record<string, unknown>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (body.name !== undefined) m.drill_name = body.name;
  if (body.planId !== undefined) m.plan_id = body.planId;
  if (body.unitId !== undefined) m.unit_id = body.unitId;
  if (body.unitName !== undefined) m.unit_name = body.unitName;
  if (body.date !== undefined) m.drill_date = body.date;
  if (body.location !== undefined) m.location = body.location;
  if (body.duration !== undefined) m.duration = body.duration;
  if (body.drillType !== undefined) m.drill_type = body.drillType;
  if (body.participants !== undefined) m.participants = body.participants;
  if (body.drillContent !== undefined) m.drill_content = body.drillContent;
  if (body.result !== undefined) m.result = body.result;
  if (body.photos !== undefined) m.photos = Array.isArray(body.photos) ? JSON.stringify(body.photos) : body.photos;
  if (body.videoUrl !== undefined) m.video_url = body.videoUrl;
  if (body.status !== undefined) m.status = body.status;
  return { ...sanitizeBody(body), ...m };
}

export const PlanController = {
  async planList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { count, rows } = await EmergencyPlan.findAndCountAll({
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async planCreate(req: Request, res: Response) {
    const p = await EmergencyPlan.create(mapPlanBody(req.body) as any);
    sendSuccess(res, req, { id: (p as any).id }, '创建成功');
  },

  async planUpdate(req: Request, res: Response) {
    await EmergencyPlan.update(mapPlanBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async planDelete(req: Request, res: Response) {
    await EmergencyPlan.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendDeleted(res, req);
  },

  async drillList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { count, rows } = await EmergencyDrill.findAndCountAll({
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async drillCreate(req: Request, res: Response) {
    const drillNo = `DR${Date.now()}${Math.floor(Math.random() * 100)}`;
    const d = await EmergencyDrill.create({ ...mapDrillBody(req.body), drill_no: drillNo } as any);
    sendSuccess(res, req, { id: (d as any).id }, '创建成功');
  },

  async drillUpdate(req: Request, res: Response) {
    await EmergencyDrill.update(mapDrillBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async drillDelete(req: Request, res: Response) {
    await EmergencyDrill.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendDeleted(res, req);
  },

  async participantList(req: Request, res: Response) {
    const drillId = parseIdStrict(req.params.id);
    const rows = await DrillParticipant.findAll({ where: { drill_id: drillId } });
    sendSuccess(res, req, rows);
  },

  async participantCreate(req: Request, res: Response) {
    const drillId = parseIdStrict(req.params.id);
    const { name, role } = req.body;
    const p = await DrillParticipant.create({ drill_id: drillId, name, role } as any);
    sendSuccess(res, req, { id: (p as any).id }, '添加成功');
  },

  async participantDelete(req: Request, res: Response) {
    const drillId = parseIdStrict(req.params.id);
    const participantId = parseIdStrict(req.params.participantId);
    await DrillParticipant.destroy({ where: { id: participantId, drill_id: drillId } });
    sendDeleted(res, req);
  },
};
