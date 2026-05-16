import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { DeviceMaintenance, Device, Unit } from '@/models';

async function fillDeviceMeta(deviceId: string | number) {
  const dev = await Device.findByPk(deviceId) as any;
  if (!dev) return { device_code: '', device_name: '', unit_name: '' };
  let unitName = '';
  if (dev.unit_id) {
    const u = await Unit.findByPk(dev.unit_id) as any;
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
    try {
      const [pending, overdue, completed, inProgress] = await Promise.all([
        DeviceMaintenance.count({ where: { status: 'pending' } }),
        DeviceMaintenance.count({ where: { status: 'overdue' } }),
        DeviceMaintenance.count({ where: { status: 'completed' } }),
        DeviceMaintenance.count({ where: { status: 'in_progress' } }),
      ]);
      return res.json(success({ pending, overdue, completed, in_progress: inProgress }));
    } catch (err: any) {
      logger.error(`[DeviceMaintenance] stats 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async list(req: Request, res: Response) {
    try {
      const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? req.query.size ?? 10), 10) || 10));
      const { keyword, type, status } = req.query;
      const where: any = {};
      if (type) where.type = type;
      if (status !== undefined && status !== '') where.status = status;
      if (keyword) {
        const kw = String(keyword).trim();
        const orList: any[] = [
          { device_code: { [Op.like]: `%${kw}%` } },
          { device_name: { [Op.like]: `%${kw}%` } },
          { unit_name: { [Op.like]: `%${kw}%` } },
        ];
        const kid = parseInt(kw, 10);
        if (Number.isFinite(kid) && kid > 0) {
          orList.push({ device_id: kid });
        }
        where[Op.or] = orList;
      }
      const { count, rows } = await DeviceMaintenance.findAndCountAll({
        where,
        limit: pageSize,
        offset: (pageNum - 1) * pageSize,
        order: [['plan_date', 'DESC']],
      });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[DeviceMaintenance] list 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async create(req: Request, res: Response) {
    try {
      const b = (req.body || {}) as Record<string, unknown>;
      const deviceId = b.device_id ?? b.deviceId;
      if (deviceId === undefined || deviceId === '') {
        return res.status(400).json(fail('device_id 不能为空', 400));
      }
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
      return res.json(success({ id: String((row as any).id) }, '创建成功'));
    } catch (e: any) {
      return res.status(400).json(fail(e?.message || '创建失败', 400));
    }
  },

  async update(req: Request, res: Response) {
    try {
      const b = (req.body || {}) as Record<string, unknown>;
      const payload: any = {};
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
        return res.json(success(null, '暂无更新内容'));
      }
      const [n] = await DeviceMaintenance.update(payload, { where: { id: req.params.id } });
      if (!n) return res.status(404).json(fail('记录不存在', 404));
      return res.json(success(null, '更新成功'));
    } catch (e: any) {
      return res.status(400).json(fail(e?.message || '更新失败', 400));
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const n = await DeviceMaintenance.destroy({ where: { id: req.params.id } });
      if (!n) return res.status(404).json(fail('记录不存在', 404));
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[DeviceMaintenance] delete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
