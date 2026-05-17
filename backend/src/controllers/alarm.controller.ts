import type { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize';
import { sendSuccess, sendPage } from '@/utils/respond';
import { HttpError } from '@/utils/httpError';
import { Alarm, Device, Unit } from '@/models';
import sequelize from '@/config/database';
import redis from '@/config/redis';
import { WebSocketService } from '@/websocket/websocket.service';
import { DeviceControlService } from '@/services/deviceControl.service';
import { LinkageService } from '@/services/linkage.service';
import { AIAriskAnalysisService } from '@/services/ai/riskAnalysis.service';
import logger from '@/config/logger';
import { generateAlarmNo } from '@/utils/alarmNo';
import { sanitizePagination } from '@/utils/validator';

/** 格式化 Date 为本地时间字符串 yyyy-MM-dd HH:mm:ss */
function fmtDateTime(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

export const AlarmController = {
  async getDetail(req: Request, res: Response) {
      const { id } = req.params;
      const alarm = await Alarm.findByPk(id, {
        include: [{ model: Device, as: 'device', required: false }],
      }) as any;
      if (!alarm) throw new HttpError('告警不存在', 404);

      const data = alarm.toJSON ? alarm.toJSON() : alarm;

      // 补充 unit_id / unit_name / location / device_name
      let unitId = data.unit_id;
      let unitName = data.unit_name;
      let location = data.location;
      let deviceName = data.device_name;
      if (!unitId && data.device?.unit_id) unitId = data.device.unit_id;
      // Device 模型无 unit_name 字段，此处 unit_name 回退无效，由下方 Unit.findByPk 补救
      if ((!location || location === '') && data.device?.install_location) location = data.device.install_location;
      if ((!deviceName || deviceName === '') && data.device?.device_name) deviceName = data.device.device_name;

      // 历史报警补救：若 device_id 为 NULL 但 device_name 有值，尝试通过 IoT 设备反查档案
      if (!data.device_id && deviceName) {
        try {
          const [iotRows]: any = await sequelize.query(
            `SELECT archive_device_id FROM fire_iot_device WHERE device_name = ? OR device_sn = ? LIMIT 1`,
            { replacements: [deviceName, deviceName] }
          );
          const archiveId = iotRows?.[0]?.archive_device_id;
          if (archiveId) {
            const [devRows]: any = await sequelize.query(
              `SELECT id, device_name, unit_id, install_location FROM fire_device WHERE id = ? LIMIT 1`,
              { replacements: [archiveId] }
            );
            const dev = devRows?.[0];
            if (dev) {
              if (!unitId && dev.unit_id) unitId = dev.unit_id;
              if ((!location || location === '') && dev.install_location) location = dev.install_location;
              if ((!deviceName || deviceName === '') && dev.device_name) deviceName = dev.device_name;
            }
          }
        } catch { /* ignore */ }
      }

      // 并行查询：单位、消控室、摄像头、平面图（减少数据库往返）
      let unit: any = null, controlRoom: any = null, cameras: any[] = [], floorPlan: any = null;
      const parallelQueries: Promise<any>[] = [];

      if (unitId) {
        parallelQueries.push(
          Unit.findByPk(unitId, { raw: true }).then((u: any) => { unit = u; if (u && !unitName) unitName = u.unit_name; }).catch(() => {}),
          sequelize.query(`SELECT * FROM fire_control_room WHERE unit_id = ? LIMIT 1`, { replacements: [unitId] })
            .then(([rows]: any) => { controlRoom = rows?.[0] || null; }).catch(() => {}),
          sequelize.query(
            `SELECT id, name, location, rtsp_url, stream_url, device_id, channel_id, online_status FROM cameras WHERE unit_id = ? LIMIT 10`,
            { replacements: [String(unitId)] }
          ).then(([rows]: any) => { cameras = rows || []; }).catch(() => {})
        );
      }

      if (data.device_id) {
        parallelQueries.push(
          sequelize.query(
            `SELECT f.id as floor_id, f.floor_name, f.floor_no, f.image_url,
                    b.id as building_id, b.building_name, dp.x, dp.y
             FROM fire_floor_device_position dp
             JOIN fire_floor f ON f.id = dp.floor_id
             JOIN fire_building b ON b.id = f.building_id
             WHERE dp.device_id = ? LIMIT 1`,
            { replacements: [data.device_id] }
          ).then(([rows]: any) => { floorPlan = rows?.[0] || null; }).catch(() => {})
        );
      }

      await Promise.all(parallelQueries);

      if (data.createdAt) data.createdAt = fmtDateTime(data.createdAt);
      if (data.updatedAt) data.updatedAt = fmtDateTime(data.updatedAt);

      // 映射 controlRoom 为前端期望的 camelCase 字段
      const mappedControlRoom = controlRoom ? {
        roomName: controlRoom.room_name,
        dutyPerson: controlRoom.duty_person,
        dutyPhone: controlRoom.duty_phone,
        managerName: controlRoom.duty_person,
        managerPhone: controlRoom.duty_phone,
        dutyOfficerName: controlRoom.duty_person,
        dutyOfficerPhone: controlRoom.duty_phone,
        safetyOfficerName: controlRoom.duty_person,
        safetyOfficerPhone: controlRoom.duty_phone,
        videoUrl: controlRoom.video_url,
      } : null;

      sendSuccess(res, req, {
        ...data,
        unit_id: unitId,
        unit_name: unitName,
        location,
        device_name: deviceName,
        unit,
        controlRoom: mappedControlRoom,
        relatedCameras: cameras,
        floorPlan,
      });
  },

  async list(req: Request, res: Response) {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { alarmType, alarmLevel, status, unitId, keyword, startTime, endTime  } = req.query;
      const where: any = {};
      if (alarmType) where.alarm_type = alarmType;
      if (alarmLevel) where.alarm_level = alarmLevel;
      if (status !== undefined) where.status = status;
      if (unitId) where.unit_id = unitId;
      if (keyword) where[Op.or] = [{ alarm_no: { [Op.like]: `%${keyword}%` } }, { device_name: { [Op.like]: `%${keyword}%` } }];
      if (startTime && endTime) where.created_at = { [Op.between]: [startTime, endTime] };

      const { count, rows } = await Alarm.findAndCountAll({
        where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Device,
            as: 'device',
            attributes: ['id', 'device_no', 'device_name', 'unit_id', 'install_location'],
            required: false,
            include: [{ model: Unit, as: 'unit', attributes: ['id', 'unit_name'], required: false }],
          },
        ],
      });
      // 补充单位名称、安装位置、设备名称：优先告警记录自身，其次取设备档案关联
      const enriched = rows.map((r: any) => {
        const data = r.toJSON ? r.toJSON() : r;
        if (!data.unit_name && data.device?.unit?.unit_name) {
          data.unit_name = data.device.unit.unit_name;
        }
        if (!data.unit_id && data.device?.unit_id) {
          data.unit_id = data.device.unit_id;
        }
        // 补充安装位置：优先告警记录自身，其次取设备档案的 install_location
        if ((!data.location || data.location === '') && data.device?.install_location) {
          data.location = data.device.install_location;
        }
        // 补充设备名称：优先告警记录自身，其次取设备档案的 device_name
        if ((!data.device_name || data.device_name === '') && data.device?.device_name) {
          data.device_name = data.device.device_name;
        }
        // 格式化时间为本地可读字符串（同时兼容 created_at / createdAt）
        if (data.createdAt) {
          const formatted = fmtDateTime(data.createdAt);
          data.createdAt = formatted;
          data.created_at = formatted;
        }
        if (data.updatedAt) {
          const formatted = fmtDateTime(data.updatedAt);
          data.updatedAt = formatted;
          data.updated_at = formatted;
        }
        return data;
      });
      sendPage(res, req, enriched, count, +pageNum, +pageSize);
  },

  async stats(req: Request, res: Response) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [total, todayCount, pending, byType, byLevel] = await Promise.all([
        Alarm.count(),
        Alarm.count({ where: { created_at: { [Op.gte]: today } } }),
        Alarm.count({ where: { status: 0 } }),
        Alarm.findAll({ attributes: ['alarm_type', [Sequelize.fn('COUNT', '*'), 'count']], group: ['alarm_type'], raw: true }),
        Alarm.findAll({ attributes: ['alarm_level', [Sequelize.fn('COUNT', '*'), 'count']], group: ['alarm_level'], raw: true }),
      ]);
      sendSuccess(res, req, { total, today: todayCount, pending, byType, byLevel });
  },

  async create(req: Request, res: Response) {
      const alarmNo = generateAlarmNo();
      const alarm = await Alarm.create({ ...req.body, alarm_no: alarmNo } as any);

      // 1. Redis发布
      await redis.publish('fire:alarm', JSON.stringify({ type: 'new_alarm', data: alarm }));

      // 2. WebSocket广播
      await WebSocketService.broadcastAlarm(alarm);

      // 3. AI风险分析（异步）
      AIAriskAnalysisService.analyzeAlarm((alarm as any).id)
        .catch(err => logger.error(`[Alarm] AI分析失败: ${err.message}`));

      // 4. 触发联动（异步）
      LinkageService.triggerLinkage((alarm as any).id, req.user?.userId, req.user?.username)
        .catch(err => logger.error(`[Alarm] 联动触发失败: ${err.message}`));

      logger.info(`[Alarm] 新告警: ${alarmNo}, type=${(alarm as any).alarm_type}`);

      sendSuccess(res, req, { id: (alarm as any).id }, '告警上报成功');
  },

  async confirm(req: Request, res: Response) {
      const { id } = req.params;
      await Alarm.update({ status: 1, confirm_time: new Date() }, { where: { id } });
      sendSuccess(res, req, null, '已确认');
  },

  async handle(req: Request, res: Response) {
      const { id } = req.params;
      const { handleResult } = req.body;
      await Alarm.update({
        status: 2, handle_time: new Date(),
        handler_id: req.user!.userId, handler_name: req.user!.username,
        handle_result: handleResult
      }, { where: { id } });
      sendSuccess(res, req, null, '处理完成');
  },

  async dismiss(req: Request, res: Response) {
      const { id } = req.params;
      await Alarm.update({ status: 3 }, { where: { id } });
      sendSuccess(res, req, null, '已标记为误报');
  },

  /** 告警消音：联动设备反控消音（需关联 device_id） */
  async silence(req: Request, res: Response) {
      const { id } = req.params;
      const alarm = await Alarm.findByPk(id) as any;
      if (!alarm) throw new HttpError('告警不存在', 404);
      if (!alarm.device_id) {
        sendSuccess(res, req, null, '已记录消音（无关联设备，未下发主机指令）');
        return;
      }
      const result = await DeviceControlService.silence(+alarm.device_id, req.user!.userId, req.user!.username);
      sendSuccess(res, req, result, result.message);
  },

  async recent(req: Request, res: Response) {
      const alarms = await Alarm.findAll({ limit: 10, order: [['created_at', 'DESC']] });
      sendSuccess(res, req, alarms);
  },

  async trend(req: Request, res: Response) {
      const days = Math.min(Math.max(parseInt(req.query.days as string) || 7, 1), 365);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const start = new Date(end); start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0, 0);

      const rows = await Alarm.findAll({
        attributes: [
          [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
          [Sequelize.fn('COUNT', '*'), 'count'],
        ],
        where: {
          created_at: { [Op.gte]: start, [Op.lte]: end },
        },
        group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
        raw: true,
      }) as any[];

      // 按原代码的日期格式化规则构建映射（本地日期 00:00:00 的 UTC 日期字符串）
      const countMap = new Map<string, number>();
      for (const r of rows) {
        const [y, m, d] = String(r.date).split('-').map(Number);
        const localMidnight = new Date(y, m - 1, d);
        const dateStr = localMidnight.toISOString().slice(0, 10);
        countMap.set(dateStr, Number(r.count) || 0);
      }

      const result: any[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const dateStr = d.toISOString().slice(0, 10);
        result.push({ date: dateStr, count: countMap.get(dateStr) || 0 });
      }
      sendSuccess(res, req, result);
  },
};
