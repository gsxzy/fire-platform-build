import { Op, Sequelize } from 'sequelize';
import { Alarm, Device, MaintenanceWorkOrder, PatrolRecord, Hazard, Unit, FireInspection } from '@/models';

export class ReportService {
  // 日报
  static async generateDailyReport(date: string) {
    const d = new Date(date); const next = new Date(d); next.setDate(next.getDate() + 1);
    const [alarmCount, fireCount, faultCount, deviceOnline, deviceTotal,
           workOrderDone, patrolCount, hazardFound, inspectionDone] = await Promise.all([
      Alarm.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next } } }),
      Alarm.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next }, alarm_type: 1 } }),
      Alarm.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next }, alarm_type: 2 } }),
      Device.count({ where: { status: 1 } }), Device.count(),
      MaintenanceWorkOrder.count({ where: { status: 2, actual_end: { [Op.gte]: d, [Op.lt]: next } } }),
      PatrolRecord.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next } } }),
      Hazard.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next } } }),
      FireInspection.count({ where: { inspect_date: { [Op.gte]: d, [Op.lt]: next } } }),
    ]);

    return {
      type: 'daily', date,
      summary: { alarmCount, fireCount, faultCount, deviceOnline, deviceTotal, deviceRate: deviceTotal ? ((deviceOnline / deviceTotal) * 100).toFixed(1) : 0, workOrderDone, patrolCount, hazardFound, inspectionDone },
      alarms: await Alarm.findAll({ where: { created_at: { [Op.gte]: d, [Op.lt]: next } }, order: [['created_at', 'DESC']], raw: true }),
    };
  }

  // 周报
  static async generateWeeklyReport(endDate: string) {
    const end = new Date(endDate); const start = new Date(end); start.setDate(start.getDate() - 7);
    const [alarmCount, workOrderTotal, patrolTotal, hazardTotal] = await Promise.all([
      Alarm.count({ where: { created_at: { [Op.gte]: start, [Op.lt]: end } } }),
      MaintenanceWorkOrder.count({ where: { created_at: { [Op.gte]: start, [Op.lt]: end } } }),
      PatrolRecord.count({ where: { created_at: { [Op.gte]: start, [Op.lt]: end } } }),
      Hazard.count({ where: { created_at: { [Op.gte]: start, [Op.lt]: end } } }),
    ]);
    const trend = await this.getDailyTrend(start, end);
    return { type: 'weekly', startDate: start.toISOString().slice(0, 10), endDate, summary: { alarmCount, workOrderTotal, patrolTotal, hazardTotal }, trend };
  }

  // 月报
  static async generateMonthlyReport(year: number, month: number) {
    const start = new Date(year, month - 1, 1); const end = new Date(year, month, 1);
    const [alarmCount, workOrderTotal, patrolTotal, hazardTotal, inspectionTotal] = await Promise.all([
      Alarm.count({ where: { created_at: { [Op.gte]: start, [Op.lt]: end } } }),
      MaintenanceWorkOrder.count({ where: { created_at: { [Op.gte]: start, [Op.lt]: end } } }),
      PatrolRecord.count({ where: { created_at: { [Op.gte]: start, [Op.lt]: end } } }),
      Hazard.count({ where: { created_at: { [Op.gte]: start, [Op.lt]: end } } }),
      FireInspection.count({ where: { created_at: { [Op.gte]: start, [Op.lt]: end } } }),
    ]);
    const trend = await this.getDailyTrend(start, end);
    const byType = await Alarm.findAll({
      attributes: ['alarm_type', [Sequelize.fn('COUNT', '*'), 'count']],
      where: { created_at: { [Op.gte]: start, [Op.lt]: end } },
      group: ['alarm_type'], raw: true,
    });
    return { type: 'monthly', year, month, summary: { alarmCount, workOrderTotal, patrolTotal, hazardTotal, inspectionTotal }, trend, byType };
  }

  // 设备运行报表
  static async generateDeviceReport(unitId?: number) {
    const where: any = {};
    if (unitId) where.unit_id = unitId;
    const devices = await Device.findAll({ where, raw: true });
    const byType = await Device.findAll({
      attributes: ['device_type', 'status', [Sequelize.fn('COUNT', '*'), 'count']],
      where, group: ['device_type', 'status'], raw: true,
    });
    return { total: devices.length, devices, byType };
  }

  // 维保报表
  static async generateMaintenanceReport(startDate: string, endDate: string) {
    const orders = await MaintenanceWorkOrder.findAll({
      where: { created_at: { [Op.between]: [startDate, endDate] } },
      order: [['created_at', 'DESC']], raw: true,
    });
    const byStatus = await MaintenanceWorkOrder.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
      where: { created_at: { [Op.between]: [startDate, endDate] } },
      group: ['status'], raw: true,
    });
    return { total: orders.length, orders, byStatus };
  }

  // 巡检台账
  static async generatePatrolReport(startDate: string, endDate: string) {
    const records = await PatrolRecord.findAll({
      where: { created_at: { [Op.between]: [startDate, endDate] } },
      order: [['created_at', 'DESC']], raw: true,
    });
    const byResult = await PatrolRecord.findAll({
      attributes: ['result', [Sequelize.fn('COUNT', '*'), 'count']],
      where: { created_at: { [Op.between]: [startDate, endDate] } },
      group: ['result'], raw: true,
    });
    return { total: records.length, records, byResult };
  }

  private static async getDailyTrend(start: Date, end: Date) {
    const result: any[] = [];
    const d = new Date(start);
    while (d < end) {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = await Alarm.count({ where: { created_at: { [Op.gte]: d, [Op.lt]: next } } });
      result.push({ date: d.toISOString().slice(0, 10), count });
      d.setDate(d.getDate() + 1);
    }
    return result;
  }
}
