import { Op } from 'sequelize';
import { DispatchRecord } from '@/models';
import logger from '@/config/logger';

const DISPATCH_DUE_MINUTES = 15; // 默认处置超时时间（分钟）

export class DispatchService {
  static async list(params: {
    status?: string; phase?: string; alarmType?: number;
    keyword?: string; startTime?: string; endTime?: string;
    handlerId?: number; pageNum?: number; pageSize?: number;
  }) {
    const { status, phase, alarmType, keyword, startTime, endTime, handlerId, pageNum = 1, pageSize = 20 } = params;
    const where: any = {};
    if (status) where.status = status;
    if (phase) where.phase = phase;
    if (alarmType) where.alarm_type = alarmType;
    if (handlerId) where.handler_id = handlerId;
    if (startTime && endTime) {
      where.created_at = { [Op.between]: [startTime, endTime] };
    }
    if (keyword) {
      where[Op.or] = [
        { alarm_no: { [Op.like]: `%${keyword}%` } },
        { handler_name: { [Op.like]: `%${keyword}%` } },
        { unit_name: { [Op.like]: `%${keyword}%` } },
        { device_name: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } },
      ];
    }
    const { count, rows } = await DispatchRecord.findAndCountAll({
      where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });
    return { list: rows, total: count, pageNum, pageSize };
  }

  static async byId(id: string) {
    return DispatchRecord.findByPk(id);
  }

  static async stats() {
    const total = await DispatchRecord.count();
    const newAlarm = await DispatchRecord.count({ where: { status: 'new' } });
    const dispatched = await DispatchRecord.count({ where: { status: 'dispatched' } });
    const handling = await DispatchRecord.count({ where: { status: 'handling' } });
    const resolved = await DispatchRecord.count({ where: { status: 'resolved' } });
    const falseAlarm = await DispatchRecord.count({ where: { status: 'false_alarm' } });
    const overdue = await DispatchRecord.count({
      where: { status: { [Op.in]: ['new', 'dispatched', 'handling'] }, overdue_time: { [Op.not]: null } },
    });
    return { total, new: newAlarm, dispatched, handling, resolved, falseAlarm, overdue };
  }

  /** 派单 */
  static async dispatch(id: string, handlerId: number, handlerName: string, note?: string) {
    const record = await DispatchRecord.findByPk(id) as any;
    if (!record) throw new Error('处置记录不存在');
    if (record.status !== 'new' && record.status !== 'pending') {
      throw new Error('当前状态不可派单');
    }
    const dueTime = new Date(Date.now() + DISPATCH_DUE_MINUTES * 60000);
    await DispatchRecord.update({
      handler_id: handlerId,
      handler_name: handlerName,
      dispatch_time: new Date(),
      dispatch_note: note || record.dispatch_note,
      status: 'dispatched',
      phase: 'verify',
      due_time: dueTime,
    }, { where: { id } });
    logger.info(`[Dispatch] 派单: record=${id} handler=${handlerName} due=${dueTime.toISOString()}`);
    return { success: true };
  }

  /** 转派 */
  static async transfer(id: string, newHandlerId: number, newHandlerName: string, note?: string) {
    const record = await DispatchRecord.findByPk(id) as any;
    if (!record) throw new Error('处置记录不存在');
    const originalHandlerId = record.handler_id;
    const originalHandlerName = record.handler_name;
    const dueTime = new Date(Date.now() + DISPATCH_DUE_MINUTES * 60000);
    await DispatchRecord.update({
      original_handler_id: originalHandlerId || record.original_handler_id,
      original_handler_name: originalHandlerName || record.original_handler_name,
      handler_id: newHandlerId,
      handler_name: newHandlerName,
      dispatch_time: new Date(),
      dispatch_note: note || record.dispatch_note,
      status: 'dispatched',
      due_time: dueTime,
    }, { where: { id } });
    logger.info(`[Dispatch] 转派: record=${id} from=${originalHandlerName} to=${newHandlerName}`);
    return { success: true };
  }

  /** 标记处置中 */
  static async startHandling(id: string, note?: string) {
    const record = await DispatchRecord.findByPk(id) as any;
    if (!record) throw new Error('处置记录不存在');
    if (record.status !== 'dispatched') {
      throw new Error('当前状态不可开始处置');
    }
    await DispatchRecord.update({
      status: 'handling',
      phase: 'handling',
      verify_time: new Date(),
      verify_note: note || record.verify_note,
    }, { where: { id } });
    return { success: true };
  }

  /** 标记完成 */
  static async resolve(id: string, _result: string, note?: string) {
    const record = await DispatchRecord.findByPk(id) as any;
    if (!record) throw new Error('处置记录不存在');
    if (record.status !== 'handling' && record.status !== 'dispatched') {
      throw new Error('当前状态不可完成处置');
    }
    const dispatchTime = record.dispatch_time ? new Date(record.dispatch_time).getTime() : Date.now();
    const responseSeconds = Math.round((Date.now() - dispatchTime) / 1000);
    await DispatchRecord.update({
      status: 'resolved',
      phase: 'archive',
      resolve_time: new Date(),
      resolve_note: note || record.resolve_note,
      response_seconds: responseSeconds,
    }, { where: { id } });
    logger.info(`[Dispatch] 完成: record=${id} response=${responseSeconds}s`);
    return { success: true, responseSeconds };
  }

  /** 标记误报 */
  static async markFalseAlarm(id: string, note?: string) {
    const record = await DispatchRecord.findByPk(id) as any;
    if (!record) throw new Error('处置记录不存在');
    await DispatchRecord.update({
      status: 'false_alarm',
      phase: 'archive',
      resolve_time: new Date(),
      resolve_note: note || record.resolve_note,
    }, { where: { id } });
    logger.info(`[Dispatch] 误报: record=${id}`);
    return { success: true };
  }

  /** 从告警创建接警处置记录（告警联动入口） */
  static async createFromAlarm(alarm: any) {
    const dueMinutes = parseInt(process.env.DISPATCH_DUE_MINUTES || '15', 10);
    const dueTime = new Date(Date.now() + dueMinutes * 60000);
    const record = await DispatchRecord.create({
      alarm_id: alarm.id,
      alarm_no: alarm.alarm_no,
      alarm_type: alarm.alarm_type,
      alarm_level: alarm.alarm_level,
      unit_id: alarm.unit_id,
      unit_name: alarm.unit_name,
      device_id: alarm.device_id,
      device_name: alarm.device_name,
      device_type: alarm.device_type,
      location: alarm.location,
      point_name: alarm.point_name,
      status: 'new',
      phase: 'receive',
      due_time: dueTime,
    } as any);
    logger.info(`[Dispatch] 自动创建: alarm=${alarm.id} dispatch=${(record as any).id}`);
    return record;
  }

  /** 超时检测（定时任务调用） */
  static async checkOverdue() {
    const now = new Date();
    const records = await DispatchRecord.findAll({
      where: {
        status: { [Op.in]: ['new', 'dispatched', 'handling'] },
        due_time: { [Op.lt]: now },
        overdue_time: null,
      },
    }) as any[];

    for (const r of records) {
      const escalationCount = (r.escalation_count || 0) + 1;
      await DispatchRecord.update({
        overdue_time: now,
        escalation_count: escalationCount,
      }, { where: { id: r.id } });
      logger.warn(`[Dispatch] 超时告警: record=${r.id} alarm=${r.alarm_no} escalation=${escalationCount}`);
    }
    return records.length;
  }
}
