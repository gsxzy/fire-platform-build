import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sendSuccess, sendDeleted, sendPage } from '@/utils/response';
import { HttpError } from '@/utils/httpError';
import { DeviceMaintenance, Device, Unit } from '@/models';

async function fillDeviceMeta(deviceId: string | number) {
  const dev = (await Device.findByPk(deviceId)) as {
    device_no?: string;
    id?: number;
    device_name?: string;
    unit_id?: number;
  } | null;
  if (!dev) return { device_code: '', device_name: '', unit_name: '' };
  let unitName = '';
  if (dev.unit_id) {
    const u = (await Unit.findByPk(dev.unit_id)) as { unit_name?: string } | null;
    unitName = u?.unit_name || '';
  }
  return {
    device_code: dev.device_no || String(dev.id),
    device_name: dev.device_name || '',
    unit_name: unitName,
  };
}

export const DeviceMaintenanceController = {
  async stats(req: Request, res: Response) {
    const [pending, overdue, completed, inProgress] = await Promise.all([
      DeviceMaintenance.count({ where: { status: 'pending' } }),
      DeviceMaintenance.count({ where: { status: 'overdue' } }),
      DeviceMaintenance.count({ where: { status: 'completed' } }),
      DeviceMaintenance.count({ where: { status: 'in_progress' } }),
    ]);
    sendSuccess(res, req, { pending, overdue, completed, in_progress: inProgress });
  },

  async list(req: Request, res: Response) {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(
      500,
      Math.max(1, parseInt(String(req.query.pageSize ?? req.query.size ?? 10), 10) || 10)
    );
    const { keyword, type, status } = req.query;
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status !== undefined && status !== '') where.status = status;
    if (keyword) {
      const kw = String(keyword).trim();
      const orList: Record<string, unknown>[] = [
        { device_code: { [Op.like]: `%${kw}%` } },
        { device_name: { [Op.like]: `%${kw}%` } },
        { unit_name: { [Op.like]: `%${kw}%` } },
      ];
      const kid = parseInt(kw, 10);
      if (Number.isFinite(kid) && kid > 0) orList.push({ device_id: kid });
      (where as { [Op.or]?: unknown })[Op.or] = orList;
    }
    const { count, rows } = await DeviceMaintenance.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['plan_date', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async create(req: Request, res: Response) {
    const b = (req.body || {}) as Record<string, unknown>;
    const deviceId = b.device_id ?? b.deviceId;
    if (deviceId === undefined || deviceId === '') {
      throw new HttpError('device_id 不能为空', 400);
    }
    try {
      const meta = await fillDeviceMeta(deviceId as string);
      const row = await DeviceMaintenance.create({
        device_id: Number(deviceId),
        device_code: meta.device_code,
        device_name: meta.device_name,
        unit_name: meta.unit_name,
        type: String(b.type || 'inspection'),
        plan_date: b.plan_date || b.planDate,
        actual_date: b.actual_date || b.actualDate || null,
        executor: b.executor ? String(b.executor) : null,
        cost: b.cost !== undefined && b.cost !== '' ? Number(b.cost) : null,
        content: b.content ? String(b.content) : null,
        status: String(b.status || 'pending'),
      } as any);
      sendSuccess(res, req, { id: String((row as any).id) }, '创建成功');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '创建失败';
      throw new HttpError(msg, 400);
    }
  },

  async update(req: Request, res: Response) {
    const b = (req.body || {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};
    if (b.type !== undefined) payload.type = b.type;
    if (b.plan_date !== undefined || b.planDate !== undefined) {
      const pd = b.plan_date ?? b.planDate;
      payload.plan_date = pd === '' || pd == null ? null : pd;
    }
    if (b.actual_date !== undefined || b.actualDate !== undefined) {
      const ad = b.actual_date ?? b.actualDate;
      payload.actual_date = ad === '' || ad == null ? null : ad;
    }
    if (b.executor !== undefined) payload.executor = b.executor;
    if (b.cost !== undefined) payload.cost = b.cost === '' ? null : Number(b.cost);
    if (b.content !== undefined) payload.content = b.content;
    if (b.status !== undefined) payload.status = b.status;
    if (Object.keys(payload).length === 0) {
      sendSuccess(res, req, null, '暂无更新内容');
      return;
    }
    const [n] = await DeviceMaintenance.update(payload, { where: { id: req.params.id } });
    if (!n) throw new HttpError('记录不存在', 404);
    sendSuccess(res, req, null, '更新成功');
  },

  async delete(req: Request, res: Response) {
    const n = await DeviceMaintenance.destroy({ where: { id: req.params.id } });
    if (!n) throw new HttpError('记录不存在', 404);
    sendDeleted(res, req);
  },
};
