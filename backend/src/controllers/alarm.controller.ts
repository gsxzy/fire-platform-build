import type { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize';
import { success, fail, page } from '@/utils/response';
import { Alarm, Device, Unit } from '@/models';
import redis from '@/config/redis';
import { WebSocketService } from '@/websocket/websocket.service';
import { DeviceControlService } from '@/services/deviceControl.service';
import { LinkageService } from '@/services/linkage.service';
import { AIAriskAnalysisService } from '@/services/ai/riskAnalysis.service';
import logger from '@/config/logger';

export const AlarmController = {
  async list(req: Request, res: Response) {
    const { pageNum = 1, pageSize = 10, alarmType, alarmLevel, status, unitId, keyword, startTime, endTime } = req.query;
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
    });
    return res.json(page(rows, count, +pageNum, +pageSize));
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
    return res.json(success({ total, today: todayCount, pending, byType, byLevel }));
  },

  async create(req: Request, res: Response) {
    const alarmNo = `ALM${Date.now()}${Math.floor(Math.random() * 1000)}`;
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

    return res.json(success({ id: (alarm as any).id }, '告警上报成功'));
  },

  async confirm(req: Request, res: Response) {
    const { id } = req.params;
    await Alarm.update({ status: 1, confirm_time: new Date() }, { where: { id } });
    return res.json(success(null, '已确认'));
  },

  async handle(req: Request, res: Response) {
    const { id } = req.params;
    const { handleResult } = req.body;
    await Alarm.update({
      status: 2, handle_time: new Date(),
      handler_id: req.user!.userId, handler_name: req.user!.username,
      handle_result: handleResult
    }, { where: { id } });
    return res.json(success(null, '处理完成'));
  },

  async dismiss(req: Request, res: Response) {
    const { id } = req.params;
    await Alarm.update({ status: 3 }, { where: { id } });
    return res.json(success(null, '已标记为误报'));
  },

  /** 告警消音：联动设备反控消音（需关联 device_id） */
  async silence(req: Request, res: Response) {
    const { id } = req.params;
    const alarm = await Alarm.findByPk(id) as any;
    if (!alarm) return res.json(fail('告警不存在'));
    if (!alarm.device_id) {
      return res.json(success(null, '已记录消音（无关联设备，未下发主机指令）'));
    }
    const result = await DeviceControlService.silence(+alarm.device_id, req.user!.userId, req.user!.username);
    return res.json(success(result, result.message));
  },

  async recent(req: Request, res: Response) {
    const alarms = await Alarm.findAll({ limit: 10, order: [['created_at', 'DESC']] });
    return res.json(success(alarms));
  },

  async trend(req: Request, res: Response) {
    const days = parseInt(req.query.days as string) || 7;
    const result: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = await Alarm.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next } } });
      result.push({ date: d.toISOString().slice(0, 10), count });
    }
    return res.json(success(result));
  },
};
