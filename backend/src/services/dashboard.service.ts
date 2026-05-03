import { Op, Sequelize } from 'sequelize';
import { User, Unit, Device, Alarm, MaintenanceWorkOrder, PatrolRecord, Hazard, ControlRoom, FireInspection, TrainingCourse } from '@/models';

export class DashboardService {
  static async getWorkbenchData(userId: number) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [alarmPending, alarmToday, deviceTotal, deviceOnline, workOrderPending,
           patrolToday, hazardPending, unitTotal, inspectionMonth, userCount] = await Promise.all([
      Alarm.count({ where: { status: 0 } }),
      Alarm.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      Device.count(),
      Device.count({ where: { status: 1 } }),
      MaintenanceWorkOrder.count({ where: { status: { [Op.in]: [0, 1] } } }),
      PatrolRecord.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      Hazard.count({ where: { status: { [Op.in]: [0, 1] } } }),
      Unit.count(),
      FireInspection.count({ where: { created_at: { [Op.gte]: monthStart } } }),
      User.count(),
    ]);

    return {
      alarm: { pending: alarmPending, today: alarmToday },
      device: { total: deviceTotal, online: deviceOnline, offline: deviceTotal - deviceOnline, rate: deviceTotal ? ((deviceOnline / deviceTotal) * 100).toFixed(1) : 0 },
      workOrder: { pending: workOrderPending },
      patrol: { today: patrolToday },
      hazard: { pending: hazardPending },
      unit: { total: unitTotal },
      inspection: { month: inspectionMonth },
      user: { total: userCount },
    };
  }

  static async getMonitorOverview() {
    const [deviceStats, alarmStats, unitStats] = await Promise.all([
      Device.findAll({
        attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
        group: ['status'], raw: true,
      }),
      Alarm.findAll({
        attributes: ['alarm_type', [Sequelize.fn('COUNT', '*'), 'count']],
        where: { status: 0 }, group: ['alarm_type'], raw: true,
      }),
      Unit.findAll({ attributes: ['unit_type', [Sequelize.fn('COUNT', '*'), 'count']], group: ['unit_type'], raw: true }),
    ]);
    return { deviceStats, alarmStats, unitStats };
  }

  static async getBigScreenData() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [unitCount, deviceCount, onlineCount, alarmTotal, alarmToday, workOrderTotal,
           workOrderDone, patrolMonth, hazardTotal, inspectionMonth] = await Promise.all([
      Unit.count(), Device.count(), Device.count({ where: { status: 1 } }),
      Alarm.count(), Alarm.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      MaintenanceWorkOrder.count(), MaintenanceWorkOrder.count({ where: { status: 2 } }),
      PatrolRecord.count({ where: { created_at: { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
      Hazard.count(), FireInspection.count({ where: { created_at: { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
    ]);

    const recentAlarms = await Alarm.findAll({ limit: 20, order: [['created_at', 'DESC']], raw: true });
    const alarmTrend = await AlarmService.getTrend(7);

    return {
      summary: { unitCount, deviceCount, onlineCount, onlineRate: deviceCount ? ((onlineCount / deviceCount) * 100).toFixed(1) : 0, alarmTotal, alarmToday },
      workOrder: { total: workOrderTotal, done: workOrderDone },
      patrol: { month: patrolMonth }, hazard: { total: hazardTotal },
      inspection: { month: inspectionMonth },
      recentAlarms, alarmTrend,
    };
  }
}

import { AlarmService } from './alarm.service';
