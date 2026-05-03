import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, fail, page } from '@/utils/response';
import { Unit } from '@/models';

/** 兼容 app 前端 / app/backend 单位字段（name、type 字符串 等）→ fire_unit 表字段 */
function mapLegacyUnitBody(body: Record<string, unknown>) {
  const b = body || {};
  const name = (b.unit_name ?? b.name) as string | undefined;
  if (!name || !String(name).trim()) {
    return { error: '单位名称不能为空' as const };
  }
  const typeStr = String(b.type ?? b.supervision_level ?? 'general');
  let unit_type = 1;
  if (typeStr === 'key' || typeStr === '2') unit_type = 2;
  else if (typeStr === 'nine-small' || typeStr === '3') unit_type = 3;

  return {
    payload: {
      unit_name: String(name).trim(),
      unit_code: (b.unit_code as string) || `U${Date.now()}`,
      unit_type,
      address: (b.address as string) || undefined,
      lng: b.lng != null && b.lng !== '' ? Number(b.lng) : undefined,
      lat: b.lat != null && b.lat !== '' ? Number(b.lat) : undefined,
      contact_name: (b.contact_name as string) || (b.contact as string) || undefined,
      contact_phone: (b.contact_phone as string) || (b.phone as string) || undefined,
      building_area:
        b.building_area != null && b.building_area !== ''
          ? Number(b.building_area)
          : b.area != null && b.area !== ''
            ? Number(b.area)
            : undefined,
      floor_count:
        b.floor_count != null
          ? parseInt(String(b.floor_count), 10)
          : b.floors != null && b.floors !== ''
            ? parseInt(String(b.floors), 10)
            : undefined,
      fire_level:
        b.fire_level != null
          ? parseInt(String(b.fire_level), 10)
          : b.fireGrade != null && b.fireGrade !== ''
            ? parseInt(String(b.fireGrade), 10)
            : 1,
      status: b.status !== undefined && b.status !== null ? parseInt(String(b.status), 10) : 1,
      remark: (b.remark as string) || undefined,
    },
  };
}

export const UnitController = {
  async list(req: Request, res: Response) {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    const { keyword, unitType, status } = req.query;
    const where: any = {};
    if (keyword) where.unit_name = { [Op.like]: `%${keyword}%` };
    if (unitType) where.unit_type = unitType;
    if (status !== undefined) where.status = status;

    const { count, rows } = await Unit.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    return res.json(page(rows, count, pageNum, pageSize));
  },

  async create(req: Request, res: Response) {
    const mapped = mapLegacyUnitBody((req.body || {}) as Record<string, unknown>);
    if ('error' in mapped) {
      return res.status(400).json(fail(mapped.error, 400));
    }
    try {
      const unit = await Unit.create(mapped.payload as any);
      return res.json(success({ id: String((unit as any).id) }, '创建成功'));
    } catch (e: any) {
      return res.status(400).json(fail(e?.message || '创建失败', 400));
    }
  },

  async update(req: Request, res: Response) {
    await Unit.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },

  async delete(req: Request, res: Response) {
    await Unit.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  async stats(req: Request, res: Response) {
    const total = await Unit.count();
    const byType = await Unit.findAll({
      attributes: ['unit_type', [Unit.sequelize!.fn('COUNT', '*'), 'count']],
      group: ['unit_type'],
      raw: true,
    });
    return res.json(success({ total, byType }));
  },
};
