import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '@/config/database';
import { sendSuccess, sendDeleted, sendPage } from '@/utils/respond';
import { HttpError } from '@/utils/httpError';
import { Unit, Device } from '@/models';
import { sanitizePagination } from '@/utils/validator';

/** 兼容 app 前端 / app/backend 单位字段（name、type 字符串 等）→ fire_unit 表字段 */
function mapLegacyUnitBody(body: Record<string, unknown>, requireName = true) {
  const b = body || {};
  const name = (b.unit_name ?? b.name) as string | undefined;
  if (requireName && (!name || !String(name).trim())) {
    return { error: '单位名称不能为空' as const };
  }
  const typeStr = String(b.type ?? b.supervision_level ?? 'general');
  let unit_type = 1;
  if (typeStr === 'key' || typeStr === '2') unit_type = 2;
  else if (typeStr === 'nine-small' || typeStr === '3') unit_type = 3;

  const payload: Record<string, unknown> = {};
  if (name !== undefined) payload.unit_name = String(name).trim();
  if (b.unit_code !== undefined) payload.unit_code = b.unit_code as string;
  if (b.id !== undefined && b.id !== '') payload.unit_code = (b.unit_code as string) || String(b.id);
  if (b.type !== undefined || b.supervision_level !== undefined) payload.unit_type = unit_type;
  if (b.address !== undefined) payload.address = (b.address as string) || undefined;
  if (b.lng !== undefined && b.lng !== '') {
    const lngVal = Number(b.lng);
    if (Number.isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
      return { error: '经度必须在 -180 ~ 180 之间' as const };
    }
    payload.lng = lngVal;
  }
  if (b.lat !== undefined && b.lat !== '') {
    const latVal = Number(b.lat);
    if (Number.isNaN(latVal) || latVal < -90 || latVal > 90) {
      return { error: '纬度必须在 -90 ~ 90 之间' as const };
    }
    payload.lat = latVal;
  }
  if (b.contact_name !== undefined || b.contact !== undefined) {
    payload.contact_name = (b.contact_name as string) || (b.contact as string) || undefined;
  }
  if (b.contact_phone !== undefined || b.phone !== undefined) {
    payload.contact_phone = (b.contact_phone as string) || (b.phone as string) || undefined;
  }
  if (b.building_area !== undefined && b.building_area !== '') {
    payload.building_area = Number(b.building_area);
  } else if (b.area !== undefined && b.area !== '') {
    payload.building_area = Number(b.area);
  }
  if (b.floor_count !== undefined) {
    payload.floor_count = parseInt(String(b.floor_count), 10);
  } else if (b.floors !== undefined && b.floors !== '') {
    payload.floor_count = parseInt(String(b.floors), 10);
  }
  if (b.fire_level !== undefined) {
    payload.fire_level = parseInt(String(b.fire_level), 10);
  } else if (b.fireGrade !== undefined && b.fireGrade !== '') {
    payload.fire_level = parseInt(String(b.fireGrade), 10);
  }
  if (b.status !== undefined && b.status !== null && String(b.status).trim() !== '') {
    const sn = parseInt(String(b.status), 10);
    if (Number.isFinite(sn)) payload.status = sn;
  }
  if (b.remark !== undefined) payload.remark = (b.remark as string) || undefined;
  if (b.risk_level !== undefined && b.risk_level !== null && b.risk_level !== '') {
    const r = String(b.risk_level);
    if (r === 'low' || r === '1') payload.fire_level = 1;
    else if (r === 'medium' || r === '2') payload.fire_level = 2;
    else if (r === 'high' || r === '3') payload.fire_level = 3;
  }

  if (b.contact_email !== undefined) payload.contact_email = (b.contact_email as string) || undefined;
  if (b.legal_person !== undefined) payload.legal_person = (b.legal_person as string) || undefined;
  if (b.license_no !== undefined) payload.license_no = (b.license_no as string) || undefined;

  return { payload };
}

export const UnitController = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { keyword, unitType: unitTypeRaw, status, type: typeRaw, risk_level: riskRaw } = req.query;
    const where: Record<string, unknown> = {};
    if (keyword) where.unit_name = { [Op.like]: `%${keyword}%` };
    const typeAlias = (unitTypeRaw ?? typeRaw) as string | undefined;
    if (typeAlias) {
      const t = String(typeAlias);
      if (t === 'general' || t === '1') where.unit_type = 1;
      else if (t === 'key' || t === '2') where.unit_type = 2;
      else if (t === 'nine-small' || t === '3') where.unit_type = 3;
      else {
        const n = parseInt(t, 10);
        if (Number.isFinite(n)) where.unit_type = n;
      }
    }
    if (status !== undefined) where.status = status;
    if (riskRaw) {
      const r = String(riskRaw);
      if (r === 'low' || r === '1') where.fire_level = 1;
      else if (r === 'medium' || r === '2') where.fire_level = 2;
      else if (r === 'high' || r === '3') where.fire_level = 3;
    }

    const { count, rows } = await Unit.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async create(req: Request, res: Response) {
    const mapped = mapLegacyUnitBody((req.body || {}) as Record<string, unknown>);
    if ('error' in mapped && mapped.error) {
      throw new HttpError(mapped.error, 400);
    }
    try {
      const unit = await Unit.create(mapped.payload as any);
      sendSuccess(res, req, { id: String((unit as any).id) }, '创建成功');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '创建失败';
      throw new HttpError(msg, 400);
    }
  },

  async update(req: Request, res: Response) {
    const mapped = mapLegacyUnitBody((req.body || {}) as Record<string, unknown>, false);
    if ('error' in mapped && mapped.error) {
      throw new HttpError(mapped.error, 400);
    }
    if (Object.keys(mapped.payload).length === 0) {
      sendSuccess(res, req, null, '暂无更新内容');
      return;
    }
    await Unit.update(mapped.payload, { where: { id: req.params.id } });
    sendSuccess(res, req, null, '更新成功');
  },

  async delete(req: Request, res: Response) {
    const unitId = req.params.id;
    const t = await sequelize.transaction();
    try {
      await Device.update(
        { unit_id: null, lifecycle_status: 1 },
        { where: { unit_id: unitId }, transaction: t }
      );
      await Unit.destroy({ where: { id: unitId }, transaction: t });
      await t.commit();
      sendDeleted(res, req);
    } catch (err) {
      await t.rollback().catch(() => {});
      throw err;
    }
  },

  async stats(req: Request, res: Response) {
    const total = await Unit.count();
    const byType = await Unit.findAll({
      attributes: ['unit_type', [Unit.sequelize!.fn('COUNT', '*'), 'count']],
      group: ['unit_type'],
      raw: true,
    });
    sendSuccess(res, req, { total, byType });
  },
};
