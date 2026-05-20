"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const xlsx_1 = __importDefault(require("xlsx"));
const cache_1 = require("@/utils/cache");
function toCSV(rows, headers) {
    if (!rows.length)
        return '';
    const cols = headers || Object.keys(rows[0]);
    const lines = [cols.join(',')];
    for (const row of rows) {
        lines.push(cols.map(c => {
            const v = row[c];
            const s = v == null ? '' : String(v);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        }).join(','));
    }
    return lines.join('\n');
}
function toXLSX(rows, sheetName = 'Sheet1') {
    const ws = xlsx_1.default.utils.json_to_sheet(rows);
    const wb = xlsx_1.default.utils.book_new();
    xlsx_1.default.utils.book_append_sheet(wb, ws, sheetName);
    return xlsx_1.default.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
class ReportService {
    // 日报
    static async generateDailyReport(date) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, `report:daily:${date}`, async () => {
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
        }, { ttl: 300 });
    }
    // 周报
    static async generateWeeklyReport(endDate) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, `report:weekly:${endDate}`, async () => {
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
        }, { ttl: 300 });
    }
    // 月报
    static async generateMonthlyReport(year, month) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, `report:monthly:${year}-${month}`, async () => {
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
        }, { ttl: 300 });
    }
    // 设备运行报表
    static async generateDeviceReport(unitId) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, `report:device:${unitId ?? 'all'}`, async () => {
            const where = {};
            if (unitId)
                where.unit_id = unitId;
            const devices = await models_1.Device.findAll({ where, raw: true });
            const byType = await models_1.Device.findAll({
                attributes: ['device_type', 'status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                where, group: ['device_type', 'status'], raw: true,
            });
            return { total: devices.length, devices, byType };
        }, { ttl: 120 });
    }
    // 维保报表
    static async generateMaintenanceReport(startDate, endDate) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, `report:maint:${startDate}:${endDate}`, async () => {
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
        }, { ttl: 120 });
    }
    // 巡检台账
    static async generatePatrolReport(startDate, endDate) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, `report:patrol:${startDate}:${endDate}`, async () => {
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
        }, { ttl: 120 });
    }
    // 通用报表导出（CSV / XLSX）
    static async exportReport(type, params) {
        const fmt = String(params.format || 'csv').toLowerCase();
        const isXlsx = fmt === 'xlsx';
        const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        switch (type) {
            case 'daily': {
                const report = await this.generateDailyReport(params.date || new Date().toISOString().slice(0, 10));
                const rows = report.alarms.map(a => ({
                    告警编号: a.alarm_no,
                    告警类型: a.alarm_type,
                    告警级别: a.alarm_level,
                    设备名称: a.device_name,
                    单位名称: a.unit_name,
                    位置: a.location,
                    告警描述: a.alarm_desc,
                    创建时间: a.created_at,
                }));
                if (isXlsx)
                    return { buffer: toXLSX(rows, '告警明细'), filename: `日报_${report.date}_${now}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
                return { content: toCSV(rows), filename: `日报_${report.date}_${now}.csv`, contentType: 'text/csv; charset=utf-8' };
            }
            case 'weekly': {
                const report = await this.generateWeeklyReport(params.endDate || new Date().toISOString().slice(0, 10));
                const rows = report.trend.map((t) => ({ 日期: t.date, 告警数: t.count }));
                if (isXlsx)
                    return { buffer: toXLSX(rows, '告警趋势'), filename: `周报_${report.endDate}_${now}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
                return { content: toCSV(rows), filename: `周报_${report.endDate}_${now}.csv`, contentType: 'text/csv; charset=utf-8' };
            }
            case 'monthly': {
                const report = await this.generateMonthlyReport(params.year || new Date().getFullYear(), params.month || new Date().getMonth() + 1);
                const rows = report.trend.map((t) => ({ 日期: t.date, 告警数: t.count }));
                if (isXlsx)
                    return { buffer: toXLSX(rows, '告警趋势'), filename: `月报_${report.year}${String(report.month).padStart(2, '0')}_${now}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
                return { content: toCSV(rows), filename: `月报_${report.year}${String(report.month).padStart(2, '0')}_${now}.csv`, contentType: 'text/csv; charset=utf-8' };
            }
            case 'device': {
                const report = await this.generateDeviceReport(params.unitId);
                const rows = report.devices.map((d) => ({
                    设备编号: d.device_no,
                    设备名称: d.device_name,
                    设备类型: d.device_type,
                    安装位置: d.install_location,
                    状态: d.status,
                    创建时间: d.created_at,
                }));
                if (isXlsx)
                    return { buffer: toXLSX(rows, '设备台账'), filename: `设备报表_${now}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
                return { content: toCSV(rows), filename: `设备报表_${now}.csv`, contentType: 'text/csv; charset=utf-8' };
            }
            case 'maintenance': {
                const s = params.startDate || new Date().toISOString().slice(0, 10);
                const e = params.endDate || new Date().toISOString().slice(0, 10);
                const report = await this.generateMaintenanceReport(s, e);
                const rows = report.orders.map((o) => ({
                    工单编号: o.work_order_no,
                    工单标题: o.title,
                    单位名称: o.unit_name,
                    状态: o.status,
                    创建时间: o.created_at,
                }));
                if (isXlsx)
                    return { buffer: toXLSX(rows, '工单列表'), filename: `维保报表_${s}_${e}_${now}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
                return { content: toCSV(rows), filename: `维保报表_${s}_${e}_${now}.csv`, contentType: 'text/csv; charset=utf-8' };
            }
            case 'patrol': {
                const s = params.startDate || new Date().toISOString().slice(0, 10);
                const e = params.endDate || new Date().toISOString().slice(0, 10);
                const report = await this.generatePatrolReport(s, e);
                const rows = report.records.map((r) => ({
                    巡检编号: r.patrol_no,
                    单位名称: r.unit_name,
                    巡检日期: r.patrol_date,
                    结果: r.result,
                    创建时间: r.created_at,
                }));
                if (isXlsx)
                    return { buffer: toXLSX(rows, '巡检记录'), filename: `巡检报表_${s}_${e}_${now}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
                return { content: toCSV(rows), filename: `巡检报表_${s}_${e}_${now}.csv`, contentType: 'text/csv; charset=utf-8' };
            }
            default:
                throw new Error(`不支持的报表类型: ${type}`);
        }
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