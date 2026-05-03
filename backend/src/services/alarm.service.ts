import { Op, Sequelize } from 'sequelize';
import { Alarm, Device, Unit } from '@/models';
import redis from '@/config/redis';

export class AlarmService {
  // 创建告警并触发推送
  static async createAlarm(data: any) {
    const alarmNo = `ALM${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const alarm = await Alarm.create({ ...data, alarm_no: alarmNo, status: 0 } as any);
    await redis.publish('fire:alarm', JSON.stringify({ type: 'new_alarm', data: alarm }));
    return alarm;
  }

  // 告警处理闭环
  static async handleAlarm(id: number, userId: number, userName: string, result: string) {
    await Alarm.update({
      status: 2, handle_time: new Date(),
      handler_id: userId, handler_name: userName, handle_result: result
    }, { where: { id } });
    return { success: true };
  }

  // 告警确认
  static async confirmAlarm(id: number) {
    await Alarm.update({ status: 1, confirm_time: new Date() }, { where: { id } });
    return { success: true };
  }

  // 告警趋势统计
  static async getTrend(days: number = 7) {
    const result: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const [fire, fault, pre] = await Promise.all([
        Alarm.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next }, alarm_type: 1 } }),
        Alarm.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next }, alarm_type: 2 } }),
        Alarm.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next }, alarm_type: 3 } }),
      ]);
      result.push({ date: d.toISOString().slice(0, 10), fire, fault, pre });
    }
    return result;
  }

  // 告警分级统计
  static async getLevelStats() {
    return Alarm.findAll({
      attributes: ['alarm_level', [Sequelize.fn('COUNT', '*'), 'count']],
      group: ['alarm_level'], raw: true,
    });
  }

  // 单位告警排行
  static async getUnitAlarmRank(limit: number = 10) {
    return Alarm.findAll({
      attributes: ['unit_name', [Sequelize.fn('COUNT', '*'), 'count']],
      group: ['unit_name'], order: [[Sequelize.fn('COUNT', '*'), 'DESC']],
      limit, raw: true,
    });
  }

  // 消音
  static async silenceAlarm(id: number) {
    await Alarm.update({ push_status: 1 }, { where: { id } });
    return { success: true };
  }

  // 批量处理
  static async batchHandle(ids: number[], userId: number, userName: string, result: string) {
    await Alarm.update({
      status: 2, handle_time: new Date(),
      handler_id: userId, handler_name: userName, handle_result: result
    }, { where: { id: { [Op.in]: ids } } });
    return { success: true, count: ids.length };
  }
}
