import { Op, Sequelize } from 'sequelize';
import { Alarm } from '@/models';
import redis from '@/config/redis';
import { generateAlarmNo } from '@/utils/alarmNo';

export class AlarmService {
  // 创建告警并触发推送
  static async createAlarm(data: any) {
    const alarmNo = generateAlarmNo();
    const alarm = await Alarm.create({ ...data, alarm_no: alarmNo, status: 0 } as any);
    // 转换为前端期望的 camelCase 格式
    const raw = alarm.toJSON ? alarm.toJSON() : alarm;

    // 数值 → 字符串映射（前端 AlarmPopup / AlarmDetailModal 依赖这些字段）
    const typeMap: Record<number, string> = { 1: 'fire', 2: 'fault', 3: 'warning', 4: 'supervisory', 5: 'test' };
    const levelMap: Record<number, string> = { 1: 'low', 2: 'normal', 3: 'high' };

    const payload = {
      ...raw,
      // camelCase 兼容
      unitName: raw.unit_name ?? raw.unitName ?? null,
      unitId: raw.unit_id ?? raw.unitId ?? null,
      deviceName: raw.device_name ?? raw.deviceName ?? null,
      deviceId: raw.device_id ?? raw.deviceId ?? null,
      alarmType: raw.alarm_type ?? raw.alarmType ?? null,
      alarmLevel: raw.alarm_level ?? raw.alarmLevel ?? null,
      alarmNo: raw.alarm_no ?? raw.alarmNo ?? null,
      alarmDesc: raw.alarm_desc ?? raw.alarmDesc ?? null,
      createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.updated_at || null,
      loopNo: raw.loop_no ?? raw.loopNo ?? null,
      address: raw.address ?? null,
      hostCode: raw.host_code ?? raw.hostCode ?? null,
      rawData: raw.raw_data ?? raw.rawData ?? null,
      handlerId: raw.handler_id ?? raw.handlerId ?? null,
      handlerName: raw.handler_name ?? raw.handlerName ?? null,
      handleTime: raw.handle_time ?? raw.handleTime ?? null,
      handleResult: raw.handle_result ?? raw.handleResult ?? null,
      confirmTime: raw.confirm_time ?? raw.confirmTime ?? null,
      pushStatus: raw.push_status ?? raw.pushStatus ?? null,
      // 字符串类型/级别（前端 LEVEL_MAP / TYPE_MAP 使用）
      type: typeMap[raw.alarm_type] ?? 'warning',
      level: levelMap[raw.alarm_level] ?? 'normal',
      // 设备类型名称（前端 AlarmDetailModal 使用 alarm.code）
      code: data.code || data.device_type_name || raw.device_type_name || undefined,
    };
    await redis.publish('fire:alarm', JSON.stringify({ type: 'new_alarm', data: payload }));
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
