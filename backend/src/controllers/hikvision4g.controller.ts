/**
 * ═══════════════════════════════════════════════════════════════════
 * 海康4G IoT 设备接入控制器
 * 支持：NP-FY300-4G(烟感) / NP-FSC200-4G(压力) / NP-FSC210-4G(液位)
 * 接入方式：设备4G直连HTTP上报（无需JWT，使用ApiKey鉴权）
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response } from 'express';
import { success, fail } from '@/utils/response';
import { IoTDevice, Device, Alarm, Unit } from '@/models';

import { DeviceHeartbeatService } from '@/services/deviceHeartbeat.service';
import sequelize from '@/config/database';
import logger from '@/config/logger';
import redis from '@/config/redis';
import { generateAlarmNo } from '@/utils/alarmNo';
import { WebSocketService } from '@/websocket/websocket.service';

if (!process.env.HIKVISION_4G_API_KEY) {
  console.error('[Hik4G] 错误：未设置 HIKVISION_4G_API_KEY 环境变量');
  process.exit(1);
}
const HIKVISION_API_KEY = process.env.HIKVISION_4G_API_KEY;
const heartbeatService = DeviceHeartbeatService.getInstance(sequelize);

/** 统一响应设备（极简，省流量） */
function deviceResponse(code: number, msg: string, data?: unknown) {
  return { code, msg, data, timestamp: Date.now() };
}

/** IoT 接口 IP 白名单校验 */
function checkIotWhitelist(req: Request, res: Response): boolean {
  const whitelist = process.env.IOT_IP_WHITELIST;
  if (!whitelist) return true; // 未配置则放行
  const allowed = whitelist.split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length === 0) return true;
  const clientIp = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '');
  if (!allowed.includes(clientIp)) {
    res.status(403).json(deviceResponse(403, '来源IP不在白名单中'));
    return false;
  }
  return true;
}

/** 原始数据落库（调试用，也用于后续逆向分析真实格式） */
async function saveRawLog(deviceSn: string, eventType: string, rawBody: unknown) {
  try {
    await sequelize.query(
      `INSERT INTO hikvision4g_raw_log (device_sn, event_type, raw_json, created_at)
       VALUES (?, ?, ?, NOW())`,
      { replacements: [deviceSn, eventType, JSON.stringify(rawBody)] }
    );
  } catch (err: any) {
    // 表可能不存在，静默忽略
    if (!err.message?.includes('ER_NO_SUCH_TABLE')) {
      logger.error(`[Hik4G] 保存原始日志失败: ${err.message}`);
    }
  }
}

/** 确保原始日志表存在 */
async function ensureRawLogTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS hikvision4g_raw_log (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        device_sn VARCHAR(100) NOT NULL,
        event_type VARCHAR(32) DEFAULT NULL,
        raw_json JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_device_sn (device_sn),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='海康4G设备原始上报日志'
    `);
  } catch (err: any) {
    logger.error(`[Hik4G] 建表失败: ${err.message}`);
  }
}
ensureRawLogTable();

/** 解析多种可能的海康字段格式 */
function resolveDeviceSn(body: Record<string, unknown>): string {
  return String(
    body.deviceId ?? body.device_id ?? body.devId ?? body.dev_id ??
    body.sn ?? body.SN ?? body.imei ?? body.IMEI ??
    body.deviceNo ?? body.device_no ?? 'unknown'
  ).trim();
}

function resolveEventType(body: Record<string, unknown>): string {
  return String(
    body.eventType ?? body.event_type ?? body.event ?? body.type ??
    body.msgType ?? body.msg_type ?? body.status ?? 'heartbeat'
  ).trim().toLowerCase();
}

function resolveDeviceType(body: Record<string, unknown>): string {
  const dt = String(
    body.deviceType ?? body.device_type ?? body.devType ?? body.dev_type ??
    body.productType ?? body.product_type ?? ''
  ).trim().toLowerCase();
  if (dt.includes('smoke') || dt.includes('烟感') || dt.includes('fy300')) return 'smoke';
  if (dt.includes('pressure') || dt.includes('压力') || dt.includes('fsc200')) return 'pressure';
  if (dt.includes('level') || dt.includes('液位') || dt.includes('fsc210')) return 'level';
  return dt;
}

/** 海康4G设备数据解析（兼容多种可能的上报格式） */
function parseHikvisionBody(body: Record<string, unknown>) {
  const deviceSn = resolveDeviceSn(body);
  const eventType = resolveEventType(body);
  const deviceType = resolveDeviceType(body);

  // 提取嵌套 data / values / payload 对象
  const dataObj = (body.data ?? body.values ?? body.payload ?? body) as Record<string, unknown>;

  const result: Record<string, unknown> = {
    deviceSn,
    eventType,
    deviceType,
    timestamp: body.timestamp ?? body.time ?? body.createTime ?? body.create_time ?? new Date().toISOString(),
    battery: dataObj.battery ?? body.battery ?? dataObj.power ?? body.power,
    signal: dataObj.signal ?? body.signal ?? dataObj.signalStrength ?? body.signalStrength ?? dataObj.rssi ?? body.rssi,
    temperature: dataObj.temperature ?? body.temperature ?? dataObj.temp ?? body.temp,
    humidity: dataObj.humidity ?? body.humidity ?? dataObj.hum ?? body.hum,
    alarm: false,
    alarmType: 0,
    alarmDesc: '',
    raw: body,
  };

  // ── 烟感 NP-FY300-4G ──
  if (deviceType === 'smoke' || eventType.includes('smoke') || eventType.includes('fire')) {
    result.smoke = dataObj.smoke ?? dataObj.smokeDensity ?? dataObj.smoke_density ?? body.smoke ?? 0;
    result.tamper = dataObj.tamper ?? body.tamper ?? dataObj.dismantle ?? body.dismantle ?? 0;
    result.mazePollution = dataObj.mazePollution ?? dataObj.maze_pollution ?? body.mazePollution ?? body.maze_pollution ?? 0;

    if (eventType.includes('alarm') || eventType.includes('fire') || body.alarm === 1 || body.alarmStatus === 1 || Number(result.smoke) > 50) {
      result.alarm = true;
      result.alarmType = 1;
      result.alarmDesc = '烟感探测器触发火警';
    }
    else if (eventType.includes('fault') || body.fault === 1 || result.mazePollution === 1) {
      result.alarm = true;
      result.alarmType = 2;
      result.alarmDesc = '烟感探测器故障';
    }
    else if (eventType.includes('lowbat') || eventType.includes('low_battery') || body.lowBattery === 1) {
      result.alarm = true;
      result.alarmType = 2;
      result.alarmDesc = '烟感电池低电量';
    }
    else if ((result as any).tamper === 1 || eventType.includes('tamper')) {
      result.alarm = true;
      result.alarmType = 2;
      result.alarmDesc = '烟感防拆报警';
    }
  }

  // ── 压力 NP-FSC200-4G ──
  if (deviceType === 'pressure' || eventType.includes('pressure')) {
    result.pressure = dataObj.pressure ?? dataObj.pressureValue ?? dataObj.pressure_value ?? body.pressure ?? 0;
    result.unit = dataObj.unit ?? body.unit ?? 'MPa';

    const p = Number(result.pressure) || 0;
    if (eventType.includes('alarm') || eventType.includes('low') || body.alarm === 1) {
      result.alarm = true;
      result.alarmType = 3;
      result.alarmDesc = `压力异常 ${p}${result.unit}`;
    }
    else if (p < 0.1) {
      result.alarm = true; result.alarmType = 3; result.alarmDesc = `压力过低 ${p}${result.unit}`;
    }
    else if (p > 1.2) {
      result.alarm = true; result.alarmType = 3; result.alarmDesc = `压力过高 ${p}${result.unit}`;
    }
  }

  // ── 液位 NP-FSC210-4G ──
  if (deviceType === 'level' || eventType.includes('level') || eventType.includes('liquid')) {
    result.level = dataObj.level ?? dataObj.levelValue ?? dataObj.level_value ?? dataObj.liquidLevel ?? body.level ?? body.liquidLevel ?? 0;
    result.unit = dataObj.unit ?? body.unit ?? 'm';

    const l = Number(result.level) || 0;
    if (eventType.includes('alarm') || eventType.includes('low') || body.alarm === 1) {
      result.alarm = true;
      result.alarmType = 3;
      result.alarmDesc = `液位异常 ${l}${result.unit}`;
    }
    else if (l < 0.5) {
      result.alarm = true; result.alarmType = 3; result.alarmDesc = `液位过低 ${l}${result.unit}`;
    }
    else if (l > 5.0) {
      result.alarm = true; result.alarmType = 3; result.alarmDesc = `液位过高 ${l}${result.unit}`;
    }
  }

  return result;
}

/** 安全转换 unit_id（过滤 PENDING 等非数字值） */
function safeUnitId(val: unknown): number | null {
  if (val === null || val === undefined || val === '' || val === 'PENDING') return null;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 创建设备告警 */
async function createAlarm(parsed: Record<string, unknown>, iotDevice: any) {
  try {
    const alarmNo = generateAlarmNo();
    const alarmType = Number(parsed.alarmType) || 1;
    const alarmLevel = alarmType === 1 ? 3 : 2;

    // 优先用 archive_device_id 查找档案，其次用 device_sn 匹配（解决 SN 不一致问题）
    let archiveDevice = null;
    if (iotDevice?.archive_device_id) {
      archiveDevice = await Device.findByPk(iotDevice.archive_device_id) as any;
    }
    if (!archiveDevice && iotDevice?.device_sn) {
      archiveDevice = await Device.findOne({
        where: { device_sn: iotDevice.device_sn },
      }) as any;
    }

    // 确定 unit_id：优先 IoT 设备，其次档案设备
    const finalUnitId = safeUnitId(iotDevice?.unit_id) ?? safeUnitId(archiveDevice?.unit_id) ?? null;
    // 确定 unit_name：Device 模型无 unit_name 字段，必须通过 unit_id 查单位表
    let finalUnitName = '';
    if (finalUnitId) {
      try {
        const unitRow = await Unit.findByPk(finalUnitId, { raw: true }) as any;
        finalUnitName = unitRow?.unit_name || '';
      } catch { /* ignore */ }
    }

    const alarm = await Alarm.create({
      alarm_no: alarmNo,
      alarm_type: alarmType,
      alarm_level: alarmLevel,
      device_id: archiveDevice?.id ?? null,
      device_name: iotDevice.device_name || iotDevice.device_sn,
      unit_id: finalUnitId,
      unit_name: finalUnitName,
      location: archiveDevice?.install_location || '',
      alarm_desc: parsed.alarmDesc,
      status: 0,
      protocol: 'Hikvision4G',
      raw_data: JSON.stringify(parsed.raw),
    } as any);

    // WebSocket 广播 + Redis 发布
    try {
      const pushPayload = {
        id: (alarm as any).id,
        alarm_no: alarmNo,
        alarm_type: alarmType,
        alarm_level: alarmLevel,
        device_id: archiveDevice?.id ?? null,
        device_name: iotDevice.device_name || iotDevice.device_sn,
        unit_id: finalUnitId,
        unit_name: finalUnitName,
        location: archiveDevice?.install_location || '',
        alarm_desc: parsed.alarmDesc,
        status: 0,
        created_at: (alarm as any).created_at || new Date().toISOString(),
      };
      await redis.publish('fire:alarm', JSON.stringify({
        type: 'new_alarm',
        data: pushPayload,
      }));
      WebSocketService.broadcastSimple('new_alarm', pushPayload);
    } catch { /* ignore */ }

    logger.warn(`[Hik4G] 告警创建: ${iotDevice.device_sn} ${parsed.alarmDesc}`);
    return alarm;
  } catch (err: any) {
    logger.error(`[Hik4G] 告警创建失败: ${err.message}`);
    return null;
  }
}

/** 更新设备在线状态 */
async function updateDeviceOnline(deviceSn: string, ip: string | null) {
  try {
    await IoTDevice.update(
      { status: 1, last_online: new Date(), ip_address: ip },
      { where: { device_sn: deviceSn } }
    );
    const iotDev = await IoTDevice.findOne({ where: { device_sn: deviceSn } }) as any;
    if (iotDev?.id) {
      await heartbeatService.updateHeartbeat(iotDev.id, deviceSn, 'Hikvision4G');
    }
  } catch (err: any) {
    logger.error(`[Hik4G] 更新设备状态失败: ${err.message}`);
  }
}

/** 同步设备到统一设备模型 */
/** 同步海康4G设备到 fire_device 档案表，并返回档案ID */
async function syncUnifiedDevice(deviceSn: string, ip: string | null, deviceType: string, state: 'online' | 'offline'): Promise<number | null> {
  const lockName = `sync_unified_device:${deviceSn}`;
  try {
    const status = state === 'online' ? 1 : 3;
    const typeName = deviceType === 'smoke' ? '4G烟感'
      : deviceType === 'pressure' ? '4G压力表'
      : deviceType === 'level' ? '4G液位表'
      : '4G物联网设备';

    // ── 获取分布式锁，防止并发注册同一设备产生重复档案 ──
    const [[lockRes]] = await sequelize.query(
      `SELECT GET_LOCK(?, 10) AS acquired`,
      { replacements: [lockName], type: 'SELECT' }
    ) as any[];
    if (!lockRes?.acquired) {
      logger.warn(`[Hik4G] 获取锁失败: ${lockName}`);
      return null;
    }

    // 若档案已存在（按 device_sn 匹配），只更新状态
    const [rows] = await sequelize.query(
      `SELECT id, device_no FROM fire_device WHERE device_sn = ? LIMIT 1`,
      { replacements: [deviceSn], type: 'SELECT' }
    ) as any[];
    const existing = rows?.[0];

    if (existing?.id) {
      await sequelize.query(
        `UPDATE fire_device SET status = ?, lifecycle_status = 2, last_online = NOW(), protocol_type = 'Hikvision4G', updated_at = NOW() WHERE id = ?`,
        { replacements: [status, existing.id] }
      );
      const deviceId = existing.id;
      await heartbeatService.updateHeartbeat(deviceId, deviceSn, 'Hikvision4G');
      if (state === 'offline') {
        await heartbeatService.markOffline(deviceId);
      }
      await sequelize.query(`SELECT RELEASE_LOCK(?)`, { replacements: [lockName] }).catch(() => {});
      return deviceId;
    }

    // 新建档案：device_no 使用随机序号，冲突时重试 3 次
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    let deviceId: number | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const seq = Math.floor(Math.random() * 900) + 100;
      const deviceNo = `EQ-${datePrefix}-${String(seq).padStart(3, '0')}`;
      try {
        await sequelize.query(
          `INSERT INTO fire_device (device_no, device_sn, device_name, device_type, unit_id, status, lifecycle_status, last_online, protocol_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, NULL, ?, 2, NOW(), 'Hikvision4G', NOW(), NOW())`,
          { replacements: [deviceNo, deviceSn, `${typeName}-${deviceSn.slice(-6)}`, typeName, status] }
        );
        // 获取刚插入的 id
        const [newRows] = await sequelize.query(
          `SELECT id FROM fire_device WHERE device_sn = ? ORDER BY id DESC LIMIT 1`,
          { replacements: [deviceSn], type: 'SELECT' }
        ) as any[];
        deviceId = newRows?.[0]?.id || null;
        break;
      } catch (e: any) {
        if (e?.original?.code === 'ER_DUP_ENTRY' && attempt < 2) continue;
        throw e;
      }
    }

    if (deviceId) {
      await heartbeatService.updateHeartbeat(deviceId, deviceSn, 'Hikvision4G');
      if (state === 'offline') {
        await heartbeatService.markOffline(deviceId);
      }
    }
    await sequelize.query(`SELECT RELEASE_LOCK(?)`, { replacements: [lockName] }).catch(() => {});
    return deviceId;
  } catch (err: any) {
    try { await sequelize.query(`SELECT RELEASE_LOCK(?)`, { replacements: [lockName] }).catch(() => {}); } catch {}
    logger.error(`[Hik4G] 同步统一设备失败: ${err.message}`);
    return null;
  }
}

/** 缓存最新设备数据到Redis（用于实时展示） */
async function cacheDeviceData(deviceSn: string, parsed: Record<string, unknown>) {
  try {
    const cache = {
      deviceSn,
      deviceType: parsed.deviceType,
      timestamp: parsed.timestamp,
      battery: parsed.battery,
      signal: parsed.signal,
      temperature: parsed.temperature,
      humidity: parsed.humidity,
      smoke: parsed.smoke,
      pressure: parsed.pressure,
      level: parsed.level,
      unit: parsed.unit,
      alarm: parsed.alarm,
      alarmDesc: parsed.alarmDesc,
      updatedAt: Date.now(),
    };
    await redis.setex(`hik4g:data:${deviceSn}`, 3600, JSON.stringify(cache));
  } catch { /* ignore */ }
}

export const Hikvision4GController = {
  /**
   * 设备数据上报（核心入口）
   * POST /api/iot/hikvision/report
   * Header: X-Hikvision-Key: {apiKey}
   */
  async report(req: Request, res: Response) {
    try {
      if (!checkIotWhitelist(req, res)) return;

      const apiKey = req.headers['x-hikvision-key'] as string;
      if (apiKey !== HIKVISION_API_KEY) {
        return res.status(401).json(deviceResponse(401, 'Unauthorized: invalid X-Hikvision-Key'));
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const clientIp = req.ip || req.socket.remoteAddress || null;

      // ── 解析数据（兼容多种格式）──
      const parsed = parseHikvisionBody(body);
      const deviceSn = String(parsed.deviceSn);

      if (deviceSn === 'unknown' || !deviceSn) {
        return res.status(400).json(deviceResponse(400, 'Missing deviceId'));
      }

      // 保存原始数据
      await saveRawLog(deviceSn, String(parsed.eventType), body);

      // ── 查找或创建设备 ──
      let iotDevice = await IoTDevice.findOne({ where: { device_sn: deviceSn } }) as any;
      let archiveId: number | null = null;
      if (!iotDevice) {
        // 自动注册：先同步创建档案，确保 archive_device_id 有值
        archiveId = await syncUnifiedDevice(deviceSn, clientIp, String(parsed.deviceType), 'online');
        iotDevice = await IoTDevice.create({
          device_sn: deviceSn,
          device_name: `海康4G-${deviceSn.slice(-8)}`,
          device_type: parsed.deviceType === 'smoke' ? '烟感' : parsed.deviceType === 'pressure' ? '压力表' : parsed.deviceType === 'level' ? '液位表' : '4G物联网设备',
          protocol_type: 'Hikvision4G',
          status: 1,
          last_online: new Date(),
          ip_address: clientIp,
          archive_device_id: archiveId,
          protocol_config: JSON.stringify({ source: 'hikvision4g', autoRegistered: true, firstSeen: new Date().toISOString() }),
        } as any);
        logger.info(`[Hik4G] 自动注册设备: ${deviceSn}, archiveId=${archiveId}`);
      }

      // ── 更新在线状态 ──
      await updateDeviceOnline(deviceSn, clientIp);
      const syncedArchiveId = await syncUnifiedDevice(deviceSn, clientIp, String(parsed.deviceType), 'online');
      // 若首次注册未获取到archiveId（理论上不应发生），补更新关联
      if (syncedArchiveId && iotDevice && !iotDevice.archive_device_id) {
        await iotDevice.update({ archive_device_id: syncedArchiveId });
      }

      // ── 缓存最新数据 ──
      await cacheDeviceData(deviceSn, parsed);

      // ── 处理告警 ──
      if (parsed.alarm) {
        await createAlarm(parsed, iotDevice);
      }

      // ── 响应设备（极简）──
      return res.json(deviceResponse(200, 'OK', { accepted: true, sn: deviceSn }));
    } catch (err: any) {
      logger.error(`[Hik4G] report error: ${err?.message || err}`);
      return res.status(500).json(deviceResponse(500, `Server error: ${err?.message || 'unknown'}`));
    }
  },

  /**
   * 设备心跳（可选，设备可复用 report 接口上报心跳）
   * POST /api/iot/hikvision/heartbeat
   */
  async heartbeat(req: Request, res: Response) {
    try {
      if (!checkIotWhitelist(req, res)) return;

      const apiKey = req.headers['x-hikvision-key'] as string;
      if (apiKey !== HIKVISION_API_KEY) {
        return res.status(401).json(deviceResponse(401, 'Unauthorized'));
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const deviceSn = resolveDeviceSn(body);
      const clientIp = req.ip || req.socket.remoteAddress || null;

      if (!deviceSn || deviceSn === 'unknown') {
        return res.status(400).json(deviceResponse(400, 'Missing deviceId'));
      }

      await updateDeviceOnline(deviceSn, clientIp);
      await syncUnifiedDevice(deviceSn, clientIp, resolveDeviceType(body), 'online');

      return res.json(deviceResponse(200, 'OK'));
    } catch (err: any) {
      logger.error(`[Hik4G] heartbeat error: ${err?.message || err}`);
      return res.status(500).json(deviceResponse(500, `Server error: ${err?.message || 'unknown'}`));
    }
  },

  /**
   * 查询设备最新数据（前端调用）
   * GET /api/iot/hikvision/devices/:sn/data
   */
  async getDeviceData(req: Request, res: Response) {
    const { sn } = req.params;
    try {
      const cached = await redis.get(`hik4g:data:${sn}`);
      const iotDevice = await IoTDevice.findOne({ where: { device_sn: sn } }) as any;
      return res.json(success({
        online: iotDevice?.status === 1,
        lastOnline: iotDevice?.last_online,
        cached: cached ? JSON.parse(cached) : null,
      }));
    } catch (err: any) {
      return res.status(500).json(fail(err.message));
    }
  },

  /**
   * 批量查询设备数据（前端调用）
   * POST /api/iot/hikvision/batch-data
   */
  async batchDeviceData(req: Request, res: Response) {
    const { sns } = req.body as { sns?: string[] };
    if (!Array.isArray(sns)) {
      return res.status(400).json(fail('sns must be array'));
    }
    try {
      const results: Record<string, unknown> = {};
      for (const sn of sns) {
        const [cached, iotDevice] = await Promise.all([
          redis.get(`hik4g:data:${sn}`),
          IoTDevice.findOne({ where: { device_sn: sn } }) as any,
        ]);
        results[sn] = {
          online: iotDevice?.status === 1,
          lastOnline: iotDevice?.last_online,
          cached: cached ? JSON.parse(cached) : null,
        };
      }
      return res.json(success(results));
    } catch (err: any) {
      return res.status(500).json(fail(err.message));
    }
  },
};
