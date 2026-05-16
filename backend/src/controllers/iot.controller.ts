import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '@/config/database';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { IoTDevice, ProtocolConfig, DataPipeline, Device, Unit } from '@/models';
import { DeviceLifecycleStatus, DeviceLifecycleRules } from '@/constants/deviceLifecycle';
import { sanitizePagination } from '@/utils/validator';

/** 路由 :id 支持数字主键或 device_sn（档案设备编码等） */
function resolveIotWhereClause(idParam: string): { id: number } | { device_sn: string } {
  const trimmed = String(idParam ?? '').trim();
  if (!trimmed) return { id: 0 };
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    if (n > 0) return { id: n };
  }
  return { device_sn: trimmed };
}

function parseProtocolConfigJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || !String(raw).trim()) return {};
  try {
    const o = JSON.parse(String(raw)) as unknown;
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return { raw };
  }
}

/** 接入页扩展字段写入 protocol_config.accessMeta（表无 floor/imei 等列时） */
function mergeAccessMetaIntoProtocolConfig(
  body: Record<string, unknown>,
  existingConfig: string | null | undefined
): string {
  const base = parseProtocolConfigJson(existingConfig);
  const prevMeta = (base.accessMeta && typeof base.accessMeta === 'object' && !Array.isArray(base.accessMeta))
    ? (base.accessMeta as Record<string, unknown>)
    : {};
  const meta: Record<string, unknown> = { ...prevMeta };
  const pick = (camel: string, snake: string) => {
    if (body[camel] !== undefined) meta[camel] = body[camel];
    if (body[snake] !== undefined) meta[snake] = body[snake];
  };
  pick('floor', 'floor');
  pick('room', 'room');
  pick('imei', 'imei');
  pick('heartbeatInterval', 'heartbeat_interval');
  pick('registerCount', 'register_count');
  pick('manufacturer', 'manufacturer');
  pick('model', 'model');
  pick('firmware', 'firmware');
  pick('productionDate', 'production_date');
  pick('installDate', 'install_date');
  pick('warrantyPeriod', 'warranty_period');
  pick('warrantyExpire', 'warranty_expire');
  pick('maintenanceExpire', 'maintenance_expire');
  pick('unitName', 'unit_name');
  // CTWing 海康4G MQTT 接入配置
  pick('productId', 'product_id');
  pick('ctwingDeviceId', 'ctwing_device_id');
  pick('ctwingPassword', 'ctwing_password');
  pick('broker', 'broker');
  pick('keepalive', 'keepalive');
  pick('thresholds', 'thresholds');

  if (body.protocol_config !== undefined && typeof body.protocol_config === 'object' && body.protocol_config !== null) {
    const ext = body.protocol_config as Record<string, unknown>;
    Object.assign(base, ext);
  } else if (typeof body.protocol_config === 'string' && String(body.protocol_config).trim()) {
    const parsed = parseProtocolConfigJson(String(body.protocol_config));
    Object.assign(base, parsed);
  }

  base.accessMeta = meta;
  return JSON.stringify(base);
}

/** 从请求体提取档案扩展字段（生产日期/安装日期/质保期等） */
function buildArchiveUpdate(body: Record<string, unknown>): Record<string, unknown> {
  const archiveUpdate: Record<string, unknown> = {};
  if (body.productionDate !== undefined && body.productionDate !== '') archiveUpdate.production_date = body.productionDate;
  if (body.installDate !== undefined && body.installDate !== '') archiveUpdate.install_date = body.installDate;
  if (body.warrantyPeriod !== undefined && body.warrantyPeriod !== '') archiveUpdate.warranty_period = Number(body.warrantyPeriod);
  if (body.warrantyExpire !== undefined && body.warrantyExpire !== '') archiveUpdate.warranty_expire = body.warrantyExpire;
  if (body.maintenanceExpire !== undefined && body.maintenanceExpire !== '') archiveUpdate.maintenance_expire = body.maintenanceExpire;
  return archiveUpdate;
}

function hasAccessMetaInBody(b: Record<string, unknown>): boolean {
  return ['floor', 'room', 'imei', 'heartbeatInterval', 'heartbeat_interval', 'registerCount', 'register_count', 'manufacturer', 'model', 'firmware', 'productionDate', 'production_date', 'installDate', 'install_date', 'warrantyPeriod', 'warranty_period', 'warrantyExpire', 'warranty_expire', 'maintenanceExpire', 'maintenance_expire', 'unitName', 'unit_name', 'productId', 'product_id', 'ctwingDeviceId', 'ctwing_device_id', 'ctwingPassword', 'ctwing_password', 'broker', 'broker', 'keepalive', 'keepalive', 'thresholds'].some(
    (k) => b[k] !== undefined
  );
}

/** 前端 IoT 设备（camelCase / 旧字段）→ fire_iot_device */
function mapIotDevicePayload(body: Record<string, unknown>, idFallback: string) {
  const b = body || {};
  const sn = String(b.device_sn ?? b.id ?? idFallback).trim() || idFallback;
  const name = String(b.device_name ?? b.name ?? 'IoT设备').trim();
  let status: number | undefined = undefined;
  if (b.status !== undefined && b.status !== null && b.status !== '') {
    const s = String(b.status);
    const sm: Record<string, number> = { normal: 1, online: 1, fault: 2, offline: 0, disabled: 0, maintenance: 1 };
    if (sm[s] !== undefined) status = sm[s];
    else {
      const n = parseInt(s, 10);
      if (Number.isFinite(n)) status = n;
    }
  }
  const payload: Record<string, unknown> = {
    device_sn: sn,
    device_name: name,
    device_type: String(b.device_type ?? b.category ?? '').slice(0, 30) || undefined,
    protocol_type: String(b.protocol_type ?? b.protocol ?? '').slice(0, 20) || undefined,
    ip_address: (b.ip_address ?? b.ip) as string | undefined,
    port: b.port !== undefined && b.port !== '' ? Number(b.port) : undefined,
  };
  if (status !== undefined) payload.status = status;
  if (b.protocol_config !== undefined && typeof b.protocol_config !== 'object') {
    payload.protocol_config = b.protocol_config;
  }
  if (hasAccessMetaInBody(b) || (b.protocol_config !== undefined && typeof b.protocol_config === 'object')) {
    payload.protocol_config = mergeAccessMetaIntoProtocolConfig(b, typeof b.protocol_config === 'string' ? String(b.protocol_config) : undefined);
  }
  return payload;
}

/** 更新：仅写入请求体中出现的字段（避免未传字段被默认值覆盖） */
function mapIotDeviceUpdatePayload(body: Record<string, unknown>) {
  const b = body || {};
  const payload: Record<string, unknown> = {};
  if (b.device_name !== undefined || b.name !== undefined) {
    payload.device_name = String(b.device_name ?? b.name ?? '').trim();
  }
  if (b.device_type !== undefined || b.category !== undefined) {
    payload.device_type = String(b.device_type ?? b.category ?? '').slice(0, 30) || undefined;
  }
  if (b.protocol_type !== undefined || b.protocol !== undefined) {
    payload.protocol_type = String(b.protocol_type ?? b.protocol ?? '').slice(0, 20) || undefined;
  }
  if (b.ip_address !== undefined || b.ip !== undefined) {
    payload.ip_address = (b.ip_address ?? b.ip) as string | undefined;
  }
  if (b.port !== undefined) payload.port = b.port !== '' ? Number(b.port) : null;
  if (b.status !== undefined && b.status !== null && b.status !== '') {
    const s = String(b.status);
    const sm: Record<string, number> = { normal: 1, online: 1, fault: 2, offline: 0, disabled: 0, maintenance: 1 };
    payload.status = sm[s] !== undefined ? sm[s] : parseInt(s, 10);
  }
  if (b.protocol_config !== undefined && typeof b.protocol_config !== 'object') {
    payload.protocol_config = b.protocol_config;
  }
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

export const IoTController = {
  async deviceList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { keyword, protocolType, status, deviceType, category, unitId } = req.query;
      const where: any = {};
      if (keyword) where[Op.or] = [{ device_name: { [Op.like]: `%${keyword}%` } }, { device_sn: { [Op.like]: `%${keyword}%` } }];
      if (protocolType) where.protocol_type = protocolType;
      if (status !== undefined && status !== '') where.status = status;
      const dt = deviceType || category;
      if (dt) where.device_type = String(dt);
      if (unitId !== undefined && unitId !== '') where.unit_id = unitId;
      /* 数据一致性过滤：排除无档案关联的孤儿记录（海康4G自动注册已同步建档） */
      const whereSafe = {
        [Op.and]: [
          where,
          { archive_device_id: { [Op.not]: null } },
        ],
      };
      const { count, rows } = await IoTDevice.findAndCountAll({
        where: whereSafe,
        limit: pageSize,
        offset: (pageNum - 1) * pageSize,
        include: [
          { model: Device, as: 'archiveDevice', attributes: ['id', 'device_no', 'device_name', 'manufacturer', 'production_date', 'warranty_period', 'warranty_expire', 'install_date', 'maintenance_expire', 'unit_id'] },
          { model: Unit, as: 'unit', attributes: ['id', 'unit_name'] },
        ],
        order: [['id', 'DESC']],
      });
      return res.json(page(rows, count, pageNum, pageSize));
    } catch (err: any) {
      logger.error(`[IoTController] deviceList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async deviceCreate(req: Request, res: Response) {
    const body = (req.body || {}) as Record<string, unknown>;
    const archiveRaw =
      body.archive_device_id ?? body.archiveDeviceId ?? body.deviceId ?? body.archiveId;
    const archiveId =
      archiveRaw != null && String(archiveRaw).trim() !== '' ? parseInt(String(archiveRaw), 10) : NaN;
    if (!Number.isFinite(archiveId) || archiveId <= 0) {
      return res
        .status(400)
        .json(fail('须先在「设备档案」完成入库，并传入档案设备ID（archive_device_id / archiveDeviceId）', 400));
    }
    const devRow = await Device.findByPk(archiveId);
    if (!devRow) return res.status(404).json(fail('档案中不存在该设备', 404));
    const dev = devRow as any;
    if (!DeviceLifecycleRules.canConnect(dev.lifecycle_status)) {
      const msg = dev.lifecycle_status === DeviceLifecycleStatus.SCRAPPED
        ? '设备已报废，不可接入'
        : DeviceLifecycleRules.messages.connect;
      return res.status(400).json(fail(msg, 400));
    }
    const archiveSn = String(dev.device_sn || dev.device_no || '').trim();
    if (!archiveSn) return res.status(400).json(fail('档案缺少设备SN/编号，请先完善档案', 400));

    /* CTWing/第三方平台接入时，device_sn 可用平台设备ID（可能与档案SN不同）
       但创建时若显传 device_sn，优先使用传入值；否则回退到档案SN */
    const incomingSn = String(body.device_sn ?? body.deviceSn ?? '').trim();
    const finalSn = incomingSn || archiveSn;
    if (incomingSn && incomingSn !== archiveSn && incomingSn !== dev.device_no) {
      logger.info(`[IoTController] 接入SN与档案SN不一致: incoming=${incomingSn}, archive=${archiveSn}, archiveId=${archiveId}`);
    }

    const t = await sequelize.transaction();
    try {
      const payload = mapIotDevicePayload(body, finalSn);
      payload.device_sn = finalSn;
      payload.device_name = dev.device_name;
      payload.device_type = dev.device_type || payload.device_type;
      (payload as any).archive_device_id = archiveId;
      payload.unit_id = (dev.unit_id && Number(dev.unit_id) > 0) ? dev.unit_id : null;

      const existing = await IoTDevice.findOne({ where: { archive_device_id: archiveId }, transaction: t });
      let row: any;
      if (existing) {
        await existing.update(payload as any, { transaction: t });
        row = existing;
      } else {
        row = await IoTDevice.create(payload as any, { transaction: t });
      }

      const nextLife = Math.max(
        Number(dev.lifecycle_status) || DeviceLifecycleStatus.REGISTERED,
        DeviceLifecycleStatus.PLATFORM_CONNECTED
      );
      await devRow.update({ lifecycle_status: nextLife } as any, { transaction: t });

      // 同步档案扩展字段（生产日期、质保期、维保到期日等）
      const archiveUpdate = buildArchiveUpdate(body);
      if (Object.keys(archiveUpdate).length > 0) {
        await devRow.update(archiveUpdate as any, { transaction: t });
      }

      await t.commit();

      return res.json(
        success(
          {
            id: String(row.id),
            archive_device_id: String(archiveId),
            device_sn: row.device_sn,
            device_name: row.device_name,
            protocol_type: row.protocol_type,
            device_type: row.device_type,
          },
          existing ? '接入配置已更新' : '接入成功'
        )
      );
    } catch (err: any) {
      await t.rollback().catch(() => {});
      logger.error(`[IoTController] deviceCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async deviceUpdate(req: Request, res: Response) {
    try {
      const whereClause = resolveIotWhereClause(req.params.id);
      let payload = mapIotDeviceUpdatePayload((req.body || {}) as Record<string, unknown>);
      const body = (req.body || {}) as Record<string, unknown>;
      if (hasAccessMetaInBody(body) || (body.protocol_config !== undefined && typeof body.protocol_config === 'object')) {
        const row = await IoTDevice.findOne({ where: whereClause });
        if (!row) return res.status(404).json(fail('设备不存在', 404));
        payload.protocol_config = mergeAccessMetaIntoProtocolConfig(body, (row as any).protocol_config);
      }
      if (Object.keys(payload).length === 0) {
        return res.json(success(null, '暂无更新内容'));
      }
      const [n] = await IoTDevice.update(payload, { where: whereClause });
      if (!n) return res.status(404).json(fail('设备不存在', 404));

      // 同步档案扩展字段
      const row = await IoTDevice.findOne({ where: whereClause });
      const archiveId = row ? (row as any).archive_device_id : null;
      if (archiveId) {
        const archiveUpdate = buildArchiveUpdate(body);
        if (Object.keys(archiveUpdate).length > 0) {
          await Device.update(archiveUpdate, { where: { id: archiveId } });
        }
      }

      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[IoTController] deviceUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async deviceDelete(req: Request, res: Response) {
    try {
      const whereClause = resolveIotWhereClause(req.params.id);
      const row = await IoTDevice.findOne({ where: whereClause });
      if (!row) return res.status(404).json(fail('设备不存在', 404));
      const r = row as any;
      const archiveId = r.archive_device_id;
      await row.destroy();
      if (archiveId) {
        const dev = await Device.findByPk(archiveId);
        if (dev) {
          const d = dev as any;
          if (d.lifecycle_status !== DeviceLifecycleStatus.SCRAPPED) {
            const hasUnit = d.unit_id != null && Number(d.unit_id) > 0;
            await dev.update({
              lifecycle_status: hasUnit
                ? DeviceLifecycleStatus.ASSIGNED
                : DeviceLifecycleStatus.REGISTERED,
            } as any);
          }
        }
      }
      return res.json(success(null, '已移除接入'));
    } catch (err: any) {
      logger.error(`[IoTController] deviceDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async protocolList(req: Request, res: Response) {
    try {
      const list = await ProtocolConfig.findAll({ limit: 1000 });
      return res.json(success(list));
    } catch (err: any) {
      logger.error(`[IoTController] protocolList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async protocolCreate(req: Request, res: Response) {
    try {
      const p = await ProtocolConfig.create(req.body as any);
      return res.json(success({ id: (p as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[IoTController] protocolCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async protocolUpdate(req: Request, res: Response) {
    try {
      await ProtocolConfig.update(req.body, { where: { id: req.params.id } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[IoTController] protocolUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async protocolDelete(req: Request, res: Response) {
    try {
      await ProtocolConfig.destroy({ where: { id: req.params.id } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[IoTController] protocolDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async pipelineList(req: Request, res: Response) {
    try {
      const list = await DataPipeline.findAll({ limit: 1000 });
      return res.json(success(list));
    } catch (err: any) {
      logger.error(`[IoTController] pipelineList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async pipelineCreate(req: Request, res: Response) {
    try {
      const p = await DataPipeline.create(req.body as any);
      return res.json(success({ id: (p as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[IoTController] pipelineCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async pipelineUpdate(req: Request, res: Response) {
    try {
      await DataPipeline.update(req.body, { where: { id: req.params.id } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[IoTController] pipelineUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
