"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
class ReportService {
    // 日报
    static async generateDailyReport(date) {
        const d = new Date(date);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const [alarmCount, fireCount, faultCount, deviceOnline, deviceTotal, workOrderDone, patrolCount, hazardFound, inspectionDone] = await Promise.all([
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: d, [sequelize_1.Op.lt]: next } } }),
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: d, [sequelize_1.Op.lt]: next }, alarm_type: 1 } }),
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: d, [sequelize_1.Op.lt]: next }, alarm_type: 2 } }),
            models_1.Device.count({ where: { status: 1 } }), models_1.Device.count(),
            models_1.MaintenanceWorkOrder.count({ where: { status: 2, actual_end: { [sequelize_1.Op.gte]: d, [sequelize_1.Op.lt]: next } } }),
            models_1.PatrolRecord.count({ where: { created_at: { [sequelize_1.Op.gte]: d, [sequelize_1.Op.lt]: next } } }),
            models_1.Hazard.count({ where: { created_at: { [sequelize_1.Op.gte]: d, [sequelize_1.Op.lt]: next } } }),
            models_1.FireInspection.count({ where: { inspect_date: { [sequelize_1.Op.gte]: d, [sequelize_1.Op.lt]: next } } }),
        ]);
        return {
            type: 'daily', date,
            summary: { alarmCount, fireCount, faultCount, deviceOnline, deviceTotal, deviceRate: deviceTotal ? ((deviceOnline / deviceTotal) * 100).toFixed(1) : 0, workOrderDone, patrolCount, hazardFound, inspectionDone },
            alarms: await models_1.Alarm.findAll({ where: { created_at: { [sequelize_1.Op.gte]: d, [sequelize_1.Op.lt]: next } }, order: [['created_at', 'DESC']], raw: true }),
        };
    }
    // 周报
    static async generateWeeklyReport(endDate) {
        const end = new Date(endDate);
        const start = new Date(end);
        start.setDate(start.getDate() - 7);
        const [alarmCount, workOrderTotal, patrolTotal, hazardTotal] = await Promise.all([
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } } }),
            models_1.MaintenanceWorkOrder.count({ where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } } }),
            models_1.PatrolRecord.count({ where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } } }),
            models_1.Hazard.count({ where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } } }),
        ]);
        const trend = await this.getDailyTrend(start, end);
        return { type: 'weekly', startDate: start.toISOString().slice(0, 10), endDate, summary: { alarmCount, workOrderTotal, patrolTotal, hazardTotal }, trend };
    }
    // 月报
    static async generateMonthlyReport(year, month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const [alarmCount, workOrderTotal, patrolTotal, hazardTotal, inspectionTotal] = await Promise.all([
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } } }),
            models_1.MaintenanceWorkOrder.count({ where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } } }),
            models_1.PatrolRecord.count({ where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } } }),
            models_1.Hazard.count({ where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } } }),
            models_1.FireInspection.count({ where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } } }),
        ]);
        const trend = await this.getDailyTrend(start, end);
        const byType = await models_1.Alarm.findAll({
            attributes: ['alarm_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
            where: { created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lt]: end } },
            group: ['alarm_type'], raw: true,
        });
        return { type: 'monthly', year, month, summary: { alarmCount, workOrderTotal, patrolTotal, hazardTotal, inspectionTotal }, trend, byType };
    }
    // 设备运行报表
    static async generateDeviceReport(unitId) {
        const where = {};
        if (unitId)
            where.unit_id = unitId;
        const devices = await models_1.Device.findAll({ where, raw: true });
        const byType = await models_1.Device.findAll({
            attributes: ['device_type', 'status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
            where, group: ['device_type', 'status'], raw: true,
        });
        return { total: devices.length, devices, byType };
    }
    // 维保报表
    static async generateMaintenanceReport(startDate, endDate) {
        const orders = await models_1.MaintenanceWorkOrder.findAll({
            where: { created_at: { [sequelize_1.Op.between]: [startDate, endDate] } },
            order: [['created_at', 'DESC']], raw: true,
        });
        const byStatus = await models_1.MaintenanceWorkOrder.findAll({
            attributes: ['status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
            where: { created_at: { [sequelize_1.Op.between]: [startDate, endDate] } },
            group: ['status'], raw: true,
        });
        return { total: orders.length, orders, byStatus };
    }
    // 巡检台账
    static async generatePatrolReport(startDate, endDate) {
        const records = await models_1.PatrolRecord.findAll({
            where: { created_at: { [sequelize_1.Op.between]: [startDate, endDate] } },
            order: [['created_at', 'DESC']], raw: true,
        });
        const byResult = await models_1.PatrolRecord.findAll({
            attributes: ['result', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
            where: { created_at: { [sequelize_1.Op.between]: [startDate, endDate] } },
            group: ['result'], raw: true,
        });
        return { total: records.length, records, byResult };
    }
    static async getDailyTrend(start, end) {
        const result = [];
        const d = new Date(start);
        while (d < end) {
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            const count = await models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: d, [sequelize_1.Op.lt]: next } } });
            result.push({ date: d.toISOString().slice(0, 10), count });
            d.setDate(d.getDate() + 1);
        }
        return result;
    }
}
exports.ReportService = ReportService;
//# sourceMappingURL=report.service.js.map