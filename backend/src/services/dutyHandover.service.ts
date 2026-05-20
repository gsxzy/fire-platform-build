import { Op } from 'sequelize';
import { DutyHandover, DutySchedule, DutyLog } from '@/models';
import { generateNo } from '@/utils/noGenerator';

export class DutyHandoverService {
  static async create(data: any) {
    const handoverNo = await generateNo('JH');
    return DutyHandover.create({ ...data, handover_no: handoverNo } as any);
  }

  static async list(params: {
    startTime?: string; endTime?: string;
    shiftId?: string; fromUserId?: string; toUserId?: string;
    status?: number; pageNum?: number; pageSize?: number;
  }) {
    const { startTime, endTime, shiftId, fromUserId, toUserId, status, pageNum = 1, pageSize = 20 } = params;
    const where: any = {};
    if (startTime && endTime) {
      where.handover_time = { [Op.between]: [startTime, endTime] };
    }
    if (shiftId) where.shift_id = shiftId;
    if (fromUserId) where.from_user_id = fromUserId;
    if (toUserId) where.to_user_id = toUserId;
    if (status !== undefined) where.status = status;

    const { count, rows } = await DutyHandover.findAndCountAll({
      where, limit: pageSize, offset: (pageNum - 1) * pageSize,
      order: [['handover_time', 'DESC']],
    });
    return { list: rows, total: count, pageNum, pageSize };
  }

  static async byId(id: string) {
    return DutyHandover.findByPk(id);
  }

  static async accept(id: string, toUserId: number, toUserName: string, toSignature?: string) {
    return DutyHandover.update({
      to_user_id: toUserId,
      to_user_name: toUserName,
      to_signature: toSignature,
      accept_time: new Date(),
      status: 1,
    }, { where: { id } });
  }

  /** 获取当前班次待交接的汇总数据 */
  static async getHandoverSummary(scheduleId: string) {
    const schedule = await DutySchedule.findByPk(scheduleId) as any;
    if (!schedule) return null;

    // 查询当班期间产生的未处置告警数（通过 dispatch_record 统计）
    const { DispatchRecord } = await import('@/models');
    const pendingAlarms = await DispatchRecord.count({
      where: {
        status: { [Op.in]: ['new', 'dispatched', 'handling'] },
        created_at: { [Op.gte]: schedule.on_duty_time || schedule.created_at },
      },
    });

    // 查询当班日志
    const logs = await DutyLog.findAll({
      where: {
        schedule_id: scheduleId,
      },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    return {
      schedule,
      pendingAlarms,
      logCount: logs.length,
      logs,
    };
  }
}
