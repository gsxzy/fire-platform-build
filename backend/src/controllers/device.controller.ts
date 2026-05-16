import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '@/config/database';
import { success, page, fail } from '@/utils/response';
import logger from '@/config/logger';
import { Device, Unit, IoTDevice } from '@/models';
import { sanitizePagination } from '@/utils/validator';

/* ─────────────────────────────────────────────────────────────────
   设备字段映射：前端 camelCase → 后端 snake_case（fire_device 表）
   兼容多层前端调用（旧版/新版/App）
   ───────────────────────────────────────────────────────────────── */

/** 生成唯一设备编号：EQ-yyyyMMdd-xxx */
function generateDeviceNo(seq = 1) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `EQ-${dateStr}-${String(seq).padStart(3, '0')}`;
}

/** 核心字段映射与校验 */
function mapLegacyDeviceBody(body: Record<string, unknown>, isCreate = false) {
  const b = body || {};
  const payload: Record<string, unknown> = {};
  const errors: string[] = [];

  // ── 必填校验 ──
  const name = (b.device_name ?? b.name) as string | undefined;
  if (!name || !String(name).trim()) {
    errors.push('设备名称不能为空');
  } else {
    payload.device_name = String(name).trim();
  }

  const type = (b.device_type ?? b.type) as string | undefined;
  if (!type || !String(type).trim()) {
    errors.push('设备类型不能为空');
  } else {
    payload.device_type = String(type).trim();
  }

  // device_no：创建时自动生成，更新时不强制（若传则校验唯一性由库处理）
  if (isCreate) {
    const explicitNo = (b.device_no ?? b.deviceNo ?? b.serialNo) as string | undefined;
    payload.device_no = explicitNo && String(explicitNo).trim()
      ? String(explicitNo).trim()
      : generateDeviceNo(Math.floor(Math.random() * 900) + 100);
  } else if (b.device_no !== undefined || b.deviceNo !== undefined) {
    const v = (b.device_no ?? b.deviceNo) as string;
    if (v && String(v).trim()) payload.device_no = String(v).trim();
  }

  // ── 可选字段映射 ──
  if (b.device_model !== undefined || b.model !== undefined) {
    const v = (b.device_model ?? b.model) as string | undefined;
    payload.device_model = v != null ? String(v) : undefined;
  }

  if (b.manufacturer !== undefined) {
    payload.manufacturer = String(b.manufacturer || '');
  }

  if (b.unit_id !== undefined || b.unitId !== undefined) {
    const v = b.unit_id ?? b.unitId;
    if (v !== '' && v !== null && v !== undefined) {
      payload.unit_id = Number(v);
    } else if (v === null) {
      payload.unit_id = null;
    }
    /* v === '' 时不设置 unit_id，避免前端未传该字段时被误判为解绑 */
  }

  if (b.install_location !== undefined || b.location !== undefined) {
    payload.install_location = String((b.install_location ?? b.location) || '');
  }

  if (b.floor !== undefined) payload.floor = String(b.floor || '');
  if (b.room !== undefined) payload.room = String(b.room || '');

  if (b.lng !== undefined && b.lng !== '' && b.lng !== null) {
    const n = Number(b.lng);
    if (Number.isFinite(n)) payload.lng = n;
  }
  if (b.lat !== undefined && b.lat !== '' && b.lat !== null) {
    const n = Number(b.lat);
    if (Number.isFinite(n)) payload.lat = n;
  }

  if (b.install_date !== undefined || b.installDate !== undefined) {
    const v = b.install_date ?? b.installDate;
    payload.install_date = v && String(v).trim() ? String(v) : undefined;
  }
  if (b.production_date !== undefined || b.productionDate !== undefined) {
    const v = b.production_date ?? b.productionDate;
    payload.production_date = v && String(v).trim() ? String(v) : undefined;
  }

  if (b.warranty_period !== undefined || b.warrantyPeriod !== undefined) {
    const v = Number(b.warranty_period ?? b.warrantyPeriod);
    if (Number.isFinite(v) && v >= 0) payload.warranty_period = v;
  }
  if (b.warranty_expire !== undefined || b.warrantyExpire !== undefined) {
    const v = b.warranty_expire ?? b.warrantyExpire;
    payload.warranty_expire = v && String(v).trim() ? String(v) : undefined;
  }
  if (b.maintenance_expire !== undefined || b.maintenanceExpire !== undefined) {
    const v = b.maintenance_expire ?? b.maintenanceExpire;
    payload.maintenance_expire = v && String(v).trim() ? String(v) : undefined;
  }

  if (b.status !== undefined && b.status !== null && String(b.status).trim() !== '') {
    const sn = parseInt(String(b.status), 10);
    if (Number.isFinite(sn)) payload.status = sn;
  }

  if (b.lifecycle_status !== undefined || b.lifecycleStatus !== undefined) {
    const v = Number(b.lifecycle_status ?? b.lifecycleStatus);
    if (Number.isFinite(v)) payload.lifecycle_status = v;
  } else if (isCreate) {
    payload.lifecycle_status = 1;
  }

  if (b.iot_id !== undefined || b.ip !== undefined) {
    payload.iot_id = String((b.iot_id ?? b.ip) || '');
  }

  if (b.protocol_type !== undefined || b.protocolType !== undefined) {
    payload.protocol_type = String((b.protocol_type ?? b.protocolType) || '');
  }

  if (b.device_sn !== undefined || b.serialNo !== undefined) {
    payload.device_sn = String((b.device_sn ?? b.serialNo) || '');
  }

  if (b.protocol_config !== undefined) {
    payload.protocol_config = typeof b.protocol_config === 'string'
      ? b.protocol_config
      : JSON.stringify(b.protocol_config);
  }

  if (b.project_code !== undefined) payload.project_code = String(b.project_code || '');

  if (b.building_id !== undefined || b.buildingId !== undefined) {
    const v = b.building_id ?? b.buildingId;
    if (v !== '' && v !== null && v !== undefined) payload.building_id = Number(v);
  }
  if (b.floor_id !== undefined || b.floorId !== undefined) {
    const v = b.floor_id ?? b.floorId;
    if (v !== '' && v !== null && v !== undefined) payload.floor_id = Number(v);
  }
  if (b.point_id !== undefined || b.pointId !== undefined) {
    const v = b.point_id ?? b.pointId;
    if (v !== '' && v !== null && v !== undefined) payload.point_id = Number(v);
  }

  // 前端额外字段：映射到扩展 JSON 字段 config 中
  const extraFields = ['remark', 'calibrationCycle', 'calibration_cycle', 'scrapYear', 'scrap_year', 'gatewayId', 'gateway_id'];
  const configExtra: Record<string, unknown> = {};
  for (const key of extraFields) {
    if (b[key] !== undefined && b[key] !== '' && b[key] !== null) {
      configExtra[key] = b[key];
    }
  }
  if (Object.keys(configExtra).length > 0) {
    payload.config = JSON.stringify(configExtra);
  }

  return { payload, errors: errors.length > 0 ? errors : undefined };
}

export const DeviceController = {
  async list(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const {
        keyword, deviceType, unitId, status,
        lifecycleStatus, lifecycle_status,
        minLifecycleStatus, min_lifecycle_status,
        hasIotConfig, has_iot_config,
      } = req.query;
      const where: any = {};
      if (keyword) {
        where[Op.or] = [
          { device_name: { [Op.like]: `%${keyword}%` } },
          { device_no: { [Op.like]: `%${keyword}%` } },
          { device_sn: { [Op.like]: `%${keyword}%` } },
        ];
      }
      if (deviceType) where.device_type = deviceType;
      if (unitId) where.unit_id = unitId;
      if (status !== undefined) where.status = status;
      const ls = lifecycleStatus ?? lifecycle_status;
      if (ls !== undefined && ls !== '') {
        const lsStr = String(ls);
        if (lsStr.includes(',')) {
          where.lifecycle_status = { [Op.in]: lsStr.split(',').map((s: string) => parseInt(s.trim(), 10)).filter(Number.isFinite) };
        } else {
          const n = parseInt(lsStr, 10);
          if (Number.isFinite(n)) where.lifecycle_status = n;
        }
      } else {
        const minLs = minLifecycleStatus ?? min_lifecycle_status;
        if (minLs !== undefined && minLs !== '') {
          const n = parseInt(String(minLs), 10);
          if (Number.isFinite(n)) where.lifecycle_status = { [Op.gte]: n };
        }
      }

      const { count, rows } = await Device.findAndCountAll({
        where,
        limit: +pageSize,
        offset: (+pageNum - 1) * +pageSize,
        include: [{ model: Unit, as: 'unit', attributes: ['id', 'unit_name'] }],
        order: [['created_at', 'DESC']],
      });
      /* 显式序列化，确保关联 unit 数据被正确提取到顶层，防止 Sequelize toJSON 差异导致前端取不到 unit_name */
      const deviceIds = rows.map((r: any) => r.id);
      /* 批量查询 fire_iot_device 的在线状态和接入情况 */
      let iotMap: Record<number, { online_status: string; has_iot: boolean }> = {};
      if (deviceIds.length > 0) {
        const iotRows = await sequelize.query(
          `SELECT archive_device_id, status, last_online FROM fire_iot_device WHERE archive_device_id IN (:ids)`,
          { replacements: { ids: deviceIds }, type: 'SELECT' }
        ) as any[];
        iotMap = iotRows.reduce((acc, row) => {
          const isOnline = row.status === 1 || (row.last_online && new Date(row.last_online).getTime() > Date.now() - 10 * 60 * 1000);
          acc[row.archive_device_id] = { online_status: isOnline ? 'online' : 'offline', has_iot: true };
          return acc;
        }, {} as Record<number, { online_status: string; has_iot: boolean }>);
      }
      const list = rows.map((r: any) => {
        const json = r.toJSON ? r.toJSON() : r;
        const unit = json.unit;
        const iotInfo = iotMap[json.id];
        return {
          ...json,
          unit_name: unit?.unit_name ?? json.unit_name ?? '',
          unit_id: json.unit_id ?? null,
          online_status: iotInfo?.online_status ?? json.online_status ?? 'offline',
          has_iot_config: !!iotInfo?.has_iot,
        };
      });
      /* 设备配置页面仅返回有IoT接入配置的设备 */
      const needIot = hasIotConfig ?? has_iot_config;
      if (needIot === 'true' || needIot === '1') {
        const filtered = list.filter((item: any) => item.has_iot_config);
        return res.json(page(filtered, filtered.length, +pageNum, +pageSize));
      }
      return res.json(page(list, count, +pageNum, +pageSize));
    } catch (err: any) {
      logger.error(`[Device] list 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { payload, errors } = mapLegacyDeviceBody((req.body || {}) as Record<string, unknown>, true);
      if (errors && errors.length > 0) {
        return res.status(400).json(fail(errors.join('；'), 400));
      }

      if (payload.device_no) {
        const exist = await Device.findOne({ where: { device_no: payload.device_no } });
        if (exist) {
          payload.device_no = generateDeviceNo(Math.floor(Math.random() * 900) + 100);
        }
      }

      const device = await Device.create(payload as any);
      logger.info(`[Device] 创建成功 id=${(device as any).id} device_no=${payload.device_no}`);
      return res.json(success({ id: (device as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[Device] create 失败: ${err?.message || err}, body=${JSON.stringify(req.body)}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { payload, errors } = mapLegacyDeviceBody((req.body || {}) as Record<string, unknown>, false);
      if (errors && errors.length > 0) {
        return res.status(400).json(fail(errors.join('；'), 400));
      }
      if (Object.keys(payload).length === 0) {
        return res.json(success(null, '暂无更新内容'));
      }

      await Device.update(payload, { where: { id: req.params.id } });
      logger.info(`[Device] 更新成功 id=${req.params.id}`);
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[Device] update 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json(fail('无效的设备ID', 400));
      }
      /* 先移除接入层，避免留下 archive_device_id 指向已删档案的孤儿或悬空引用 */
      await IoTDevice.destroy({ where: { archive_device_id: id } });
      await Device.destroy({ where: { id } });
      logger.info(`[Device] 删除成功 id=${id}`);
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[Device] delete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async stats(req: Request, res: Response) {
    try {
      const total = await Device.count();
      const online = await Device.count({ where: { status: 1 } });
      const offline = await Device.count({ where: { status: 3 } });
      const fault = await Device.count({ where: { status: 2 } });
      return res.json(success({
        total,
        online,
        offline,
        fault,
        onlineRate: total ? ((online / total) * 100).toFixed(1) : 0,
      }));
    } catch (err: any) {
      logger.error(`[Device] stats 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async types(req: Request, res: Response) {
    try {
      const types = await Device.findAll({
        attributes: ['device_type', [Device.sequelize!.fn('COUNT', '*'), 'count']],
        group: ['device_type'], raw: true,
      });
      return res.json(success(types));
    } catch (err: any) {
      logger.error(`[Device] types 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async scrap(req: Request, res: Response) {
    try {
      await Device.update(
        { status: 4, lifecycle_status: 5 },
        { where: { id: req.params.id } }
      );
      logger.info(`[Device] 报废成功 id=${req.params.id}`);
      return res.json(success(null, '报废成功'));
    } catch (err: any) {
      logger.error(`[Device] scrap 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async getConfig(req: Request, res: Response) {
    try {
      const device = await Device.findByPk(req.params.id) as any;
      let config = {};
      try {
        config = device?.config ? JSON.parse(device.config) : {};
      } catch {
        config = {};
      }
      return res.json(success(config));
    } catch (err: any) {
      logger.error(`[Device] getConfig 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const configJson = JSON.stringify(req.body || {});
      await Device.update(
        { config: configJson },
        { where: { id: req.params.id } }
      );
      logger.info(`[Device] 配置保存成功 id=${req.params.id}`);
      return res.json(success(null, '配置保存成功'));
    } catch (err: any) {
      logger.error(`[Device] saveConfig 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
