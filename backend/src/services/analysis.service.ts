import { Op, Sequelize } from 'sequelize';
import { Alarm, Device, MaintenanceWorkOrder, PatrolRecord, Hazard, Unit } from '@/models';

export class AnalysisService {
  // 设备运行数据分析
  static async deviceAnalysis(days: number = 30) {
    const start = new Date(); start.setDate(start.getDate() - days);

    const [byType, byStatus, onlineTrend, faultTrend] = await Promise.all([
      Device.findAll({
        attributes: ['device_type', [Sequelize.fn('COUNT', '*'), 'count']],
        group: ['device_type'], raw: true,
      }),
      Device.findAll({
        attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
        group: ['status'], raw: true,
      }),
      this.getDeviceOnlineTrend(days),
      Alarm.findAll({
        attributes: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'], [Sequelize.fn('COUNT', '*'), 'count']],
        where: { created_at: { [Op.gte]: start }, alarm_type: 2 },
        group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
        order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
        raw: true,
      }),
    ]);

    return { byType, byStatus, onlineTrend, faultTrend };
  }

  // 告警频次分析
  static async alarmAnalysis(days: number = 30) {
    const start = new Date(); start.setDate(start.getDate() - days);

    const [byType, byLevel, byHour, byUnit] = await Promise.all([
      Alarm.findAll({
        attributes: ['alarm_type', [Sequelize.fn('COUNT', '*'), 'count']],
        where: { created_at: { [Op.gte]: start } },
        group: ['alarm_type'], raw: true,
      }),
      Alarm.findAll({
        attributes: ['alarm_level', [Sequelize.fn('COUNT', '*'), 'count']],
        where: { created_at: { [Op.gte]: start } },
        group: ['alarm_level'], raw: true,
      }),
      Alarm.findAll({
        attributes: [[Sequelize.fn('HOUR', Sequelize.col('created_at')), 'hour'], [Sequelize.fn('COUNT', '*'), 'count']],
        where: { created_at: { [Op.gte]: start } },
        group: [Sequelize.fn('HOUR', Sequelize.col('created_at'))],
        order: [[Sequelize.fn('HOUR', Sequelize.col('created_at')), 'ASC']],
        raw: true,
      }),
      Alarm.findAll({
        attributes: ['unit_name', [Sequelize.fn('COUNT', '*'), 'count']],
        where: { created_at: { [Op.gte]: start } },
        group: ['unit_name'], order: [[Sequelize.fn('COUNT', '*'), 'DESC']], limit: 10, raw: true,
      }),
    ]);

    return { byType, byLevel, byHour, byUnit };
  }

  // 维保数据分析
  static async maintenanceAnalysis() {
    const [byStatus, byType, monthly] = await Promise.all([
      MaintenanceWorkOrder.findAll({
        attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
        group: ['status'], raw: true,
      }),
      MaintenanceWorkOrder.findAll({
        attributes: ['order_type', [Sequelize.fn('COUNT', '*'), 'count']],
        group: ['order_type'], raw: true,
      }),
      MaintenanceWorkOrder.findAll({
        attributes: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('created_at'), '%Y-%m'), 'month'], [Sequelize.fn('COUNT', '*'), 'count']],
        group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('created_at'), '%Y-%m')],
        order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('created_at'), '%Y-%m'), 'ASC']],
        limit: 12, raw: true,
      }),
    ]);
    return { byStatus, byType, monthly };
  }

  // 隐患规律分析
  static async hazardAnalysis() {
    const [byType, byLevel, byStatus, monthly] = await Promise.all([
      Hazard.findAll({ attributes: ['hazard_type', [Sequelize.fn('COUNT', '*'), 'count']], group: ['hazard_type'], raw: true }),
      Hazard.findAll({ attributes: ['level', [Sequelize.fn('COUNT', '*'), 'count']], group: ['level'], raw: true }),
      Hazard.findAll({ attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']], group: ['status'], raw: true }),
      Hazard.findAll({
        attributes: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('created_at'), '%Y-%m'), 'month'], [Sequelize.fn('COUNT', '*'), 'count']],
        group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('created_at'), '%Y-%m')],
        order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('created_at'), '%Y-%m'), 'ASC']],
        limit: 12, raw: true,
      }),
    ]);
    return { byType, byLevel, byStatus, monthly };
  }

  // 巡检完成率统计
  static async patrolCompletion(days: number = 30) {
    const start = new Date(); start.setDate(start.getDate() - days);
    const [total, normal, abnormal] = await Promise.all([
      PatrolRecord.count({ where: { created_at: { [Op.gte]: start } } }),
      PatrolRecord.count({ where: { created_at: { [Op.gte]: start }, result: 1 } }),
      PatrolRecord.count({ where: { created_at: { [Op.gte]: start }, result: 2 } }),
    ]);
    return { total, normal, abnormal, rate: total ? ((normal / total) * 100).toFixed(1) : 0 };
  }

  private static async getDeviceOnlineTrend(days: number) {
    // 返回设备在线率趋势（模拟历史数据）
    const result: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const total = await Device.count();
      const online = await Device.count({ where: { status: 1 } });
      result.push({ date: d.toISOString().slice(0, 10), rate: total ? ((online / total) * 100).toFixed(1) : 0 });
    }
    return result;
  }
}
