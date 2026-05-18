import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sendSuccess, sendPage } from '@/utils/respond';
import { FireInspection, InspectionTemplate, Hazard } from '@/models';
import { parseIdStrict, sanitizeBody } from '@/utils/validator';
import { HttpError } from '@/utils/httpError';
import logger from '@/config/logger';

function parsePage(req: Request) {
  const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
  return { pageNum, pageSize };
}

export const InspectionController = {
  /* ── 检查记录 ── */
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { inspectType, status, keyword } = req.query;
    const where: Record<string, unknown> = {};
    if (inspectType) where.inspect_type = inspectType;
    if (status !== undefined && status !== '') where.status = status;
    if (keyword) {
      (where as { [Op.or]?: unknown })[Op.or] = [
        { inspect_no: { [Op.like]: `%${keyword}%` } },
        { unit_name: { [Op.like]: `%${keyword}%` } },
      ];
    }
    const { count, rows } = await FireInspection.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async create(req: Request, res: Response) {
    const body = sanitizeBody(req.body);
    const inspectNo = `IN${Date.now()}${Math.floor(Math.random() * 100)}`;

    // 如果传了 template_id，自动展开检查项
    let items = body.items;
    const tplId = body.template_id ? parseInt(String(body.template_id), 10) : NaN;
    if (Number.isFinite(tplId) && !items) {
      const tpl = await InspectionTemplate.findByPk(tplId) as any;
      if (tpl?.items) items = tpl.items;
    }

    const i = await FireInspection.create({ ...body, inspect_no: inspectNo, items } as any);

    // 整改闭环：不合格/限期整改时自动创建隐患
    const result = parseInt(String(body.result), 10);
    if (result === 2 || result === 3) {
      await createHazardFromInspection((i as any).id, body, result);
    }

    sendSuccess(res, req, { id: (i as any).id }, '创建成功');
  },

  async update(req: Request, res: Response) {
    const body = sanitizeBody(req.body);
    const id = parseIdStrict(req.params.id);
    const prev = await FireInspection.findByPk(id) as any;
    if (!prev) throw new HttpError('记录不存在', 404, 404);

    await FireInspection.update(body, { where: { id } });

    // 整改闭环：更新后如果结果为不合格且之前没有关联隐患，则创建
    const newResult = body.result !== undefined ? parseInt(String(body.result), 10) : prev.result;
    if ((newResult === 2 || newResult === 3) && !prev.hazard_id) {
      await createHazardFromInspection(id, { ...prev, ...body }, newResult);
    }

    sendSuccess(res, req, null, '更新成功');
  },

  async delete(req: Request, res: Response) {
    await FireInspection.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  /* ── 检查项模板 ── */
  async templateList(req: Request, res: Response) {
    const { pageNum, pageSize } = parsePage(req);
    const { count, rows } = await InspectionTemplate.findAndCountAll({
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async templateCreate(req: Request, res: Response) {
    const t = await InspectionTemplate.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (t as any).id }, '创建成功');
  },

  async templateUpdate(req: Request, res: Response) {
    await InspectionTemplate.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async templateDelete(req: Request, res: Response) {
    await InspectionTemplate.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },
};

/** 不合格/限期整改时自动创建隐患记录 */
async function createHazardFromInspection(inspectionId: number, body: any, result: number) {
  try {
    const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
    const hazard = await Hazard.create({
      hazard_no: hazardNo,
      unit_id: body.unit_id || null,
      unit_name: body.unit_name || '',
      description: body.items
        ? `消防检查发现隐患：${typeof body.items === 'string' ? body.items : JSON.stringify(body.items)}`
        : '消防检查不合格',
      level: result === 3 ? 2 : 1,
      status: 0,
      deadline: new Date(Date.now() + 7 * 86400000),
    } as any);

    await FireInspection.update(
      { hazard_id: (hazard as any).id, status: 2 },
      { where: { id: inspectionId } }
    );
  } catch (e: any) {
    logger.error(`[Inspection] 创建隐患失败: ${e.message}`);
  }
}
