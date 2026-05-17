"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const alarm_service_1 = require("./alarm.service");
const duty_service_1 = require("./duty.service");
class DashboardService {
    static async getWorkbenchData(userId) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [alarmPending, alarmToday, deviceTotal, deviceOnlineCount, workOrderPending, patrolToday, hazardPending, unitTotal, inspectionMonth, userCount, todayFire, todayFault, alarmMonth, alarmMonthHandled,] = await Promise.all([
            models_1.Alarm.count({ where: { status: 0 } }),
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart } } }),
            models_1.Device.count(),
            models_1.Device.count({ where: { status: 1 } }),
            models_1.MaintenanceWorkOrder.count({ where: { status: { [sequelize_1.Op.in]: [0, 1] } } }),
            models_1.PatrolRecord.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart } } }),
            models_1.Hazard.count({ where: { status: { [sequelize_1.Op.in]: [0, 1] } } }),
            models_1.Unit.count(),
            models_1.FireInspection.count({ where: { created_at: { [sequelize_1.Op.gte]: monthStart } } }),
            models_1.User.count(),
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart }, alarm_type: 1 } }),
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart }, alarm_type: 2 } }),
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: monthStart } } }),
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: monthStart }, status: 2 } }),
        ]);
        const [trendRaw, deviceTypeRows, unitTypeRows, weeklyStats, currentDuty, pendingAlarmRows, pendingWoRows, pendingHazardRows, unitDeviceAgg,] = await Promise.all([
            alarm_service_1.AlarmService.getTrend(7),
            models_1.Device.findAll({
                attributes: ['device_type', 'status', [sequelize_1.Sequelize.fn('COUNT', sequelize_1.Sequelize.col('id')), 'cnt']],
                group: ['device_type', 'status'],
                raw: true,
            }),
            models_1.Unit.findAll({
                attributes: ['unit_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'cnt']],
                group: ['unit_type'],
                raw: true,
            }),
            DashboardService.buildWeeklyAlarmStats(now),
            duty_service_1.DutyService.getCurrentDuty(),
            models_1.Alarm.findAll({
                where: { status: 0 },
                limit: 8,
                order: [['created_at', 'DESC']],
                attributes: ['id', 'alarm_no', 'device_name', 'created_at'],
                raw: true,
            }),
            models_1.MaintenanceWorkOrder.findAll({
                where: { status: { [sequelize_1.Op.in]: [0, 1] } },
                limit: 4,
                order: [['created_at', 'DESC']],
                attributes: ['id', 'order_no', 'device_name', 'created_at'],
                raw: true,
            }),
            models_1.Hazard.findAll({
                where: { status: { [sequelize_1.Op.in]: [0, 1] } },
                limit: 3,
                order: [['created_at', 'DESC']],
                attributes: ['id', 'hazard_no', 'created_at'],
                raw: true,
            }),
            models_1.Device.findAll({
                attributes: [
                    'unit_id',
                    [sequelize_1.Sequelize.fn('COUNT', sequelize_1.Sequelize.col('id')), 'total'],
                    [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.literal('CASE WHEN status = 1 THEN 1 ELSE 0 END')), 'online'],
                ],
                where: { unit_id: { [sequelize_1.Op.ne]: null } },
                group: ['unit_id'],
                raw: true,
            }),
        ]);
        const alarmTrend = trendRaw.map((row) => ({
            day: String(row.date).slice(5),
            fire: row.fire,
            fault: row.fault,
            warn: row.pre,
        }));
        const deviceOnlineMap = new Map();
        for (const r of deviceTypeRows) {
            const name = String(r.device_type || '未分类');
            const agg = deviceOnlineMap.get(name) || { total: 0, online: 0 };
            const c = Number(r.cnt);
            agg.total += c;
            if (Number(r.status) === 1)
                agg.online += c;
            deviceOnlineMap.set(name, agg);
        }
        let deviceOnline = Array.from(deviceOnlineMap.entries()).map(([name, v]) => ({ name, total: v.total, online: v.online }));
        if (deviceOnline.length === 0 && deviceTotal > 0) {
            deviceOnline = [{ name: '全部设备', total: deviceTotal, online: deviceOnlineCount }];
        }
        const unitTypeLabels = {
            1: { name: '一般单位', color: '#3b82f6' },
            2: { name: '重点单位', color: '#ef4444' },
            3: { name: '九小场所', color: '#f59e0b' },
        };
        let unitStatus = unitTypeRows.map((r) => {
            const ut = Number(r.unit_type);
            const meta = unitTypeLabels[ut] || { name: `类型${ut}`, color: '#64748b' };
            return { name: meta.name, value: Number(r.cnt), color: meta.color };
        });
        if (unitStatus.length === 0 && unitTotal > 0) {
            unitStatus = [{ name: '单位', value: unitTotal, color: '#3b82f6' }];
        }
        let unitsWithDev = 0;
        let unitsAllOnline = 0;
        for (const row of unitDeviceAgg) {
            const t = Number(row.total);
            const o = Number(row.online);
            if (t <= 0)
                continue;
            unitsWithDev += 1;
            if (o === t)
                unitsAllOnline += 1;
        }
        const unitOnlineRate = unitsWithDev ? ((unitsAllOnline / unitsWithDev) * 100).toFixed(1) : '0';
        const deviceRateStr = deviceTotal ? ((deviceOnlineCount / deviceTotal) * 100).toFixed(1) : '0';
        const fmtTime = (d) => {
            const x = new Date(d);
            if (Number.isNaN(x.getTime()))
                return '—';
            return `${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
        };
        const todos = [];
        let tid = 1;
        for (const a of pendingAlarmRows) {
            const no = a.alarm_no || `#${a.id}`;
            const dn = a.device_name ? ` ${a.device_name}` : '';
            todos.push({ id: tid++, title: `处理告警 ${no}${dn}`.trim(), priority: 'urgent', time: fmtTime(a.created_at) });
        }
        for (const w of pendingWoRows) {
            const no = w.order_no || `#${w.id}`;
            const dn = w.device_name ? ` ${w.device_name}` : '';
            todos.push({ id: tid++, title: `维保工单 ${no}${dn}`.trim(), priority: 'high', time: fmtTime(w.created_at) });
        }
        for (const h of pendingHazardRows) {
            const no = h.hazard_no || `#${h.id}`;
            todos.push({ id: tid++, title: `隐患整改 ${no}`, priority: 'normal', time: fmtTime(h.created_at) });
        }
        const dutyList = currentDuty;
        const duty = dutyList?.length
            ? { name: String(dutyList[0].user_name || '值班员'), phone: '' }
            : { name: '暂无排班', phone: '' };
        const monthHandledRate = alarmMonth > 0 ? ((alarmMonthHandled / alarmMonth) * 100).toFixed(1) : '0';
        const shortcuts = [
            { label: '告警中心', path: '/alarm/center', icon: 'Bell', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', badge: alarmPending > 0 ? String(alarmPending) : '' },
            { label: '接警处置', path: '/duty/dispatch', icon: 'PhoneCall', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', badge: '' },
            { label: '设备档案', path: '/device/archive', icon: 'Cpu', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: '' },
            { label: '维保工单', path: '/maintenance/workorder', icon: 'Wrench', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', badge: workOrderPending > 0 ? String(workOrderPending) : '' },
            { label: '巡检记录', path: '/patrol/record', icon: 'ClipboardList', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', badge: '' },
            { label: '隐患管理', path: '/patrol/hazard', icon: 'Shield', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', badge: hazardPending > 0 ? String(hazardPending) : '' },
            { label: '数据大屏', path: '/bigscreen', icon: 'LayoutDashboard', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', badge: '' },
            { label: '知识库', path: '/knowledge/base', icon: 'BookOpen', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', badge: '' },
        ];
        return {
            alarm: {
                pending: alarmPending,
                today: alarmToday,
                trend: alarmTrend,
                monthTotal: alarmMonth,
                monthHandled: alarmMonthHandled,
                monthHandledRate,
            },
            device: {
                total: deviceTotal,
                online: deviceOnlineCount,
                offline: deviceTotal - deviceOnlineCount,
                rate: deviceRateStr,
                byType: deviceOnline,
            },
            workOrder: { pending: workOrderPending },
            patrol: { today: patrolToday },
            hazard: { pending: hazardPending },
            unit: { total: unitTotal, onlineRate: unitOnlineRate },
            inspection: { month: inspectionMonth },
            user: { total: userCount },
            stats: {
                todayFire,
                todayFault,
                alarmPending,
                workOrderPending,
                patrolToday,
                hazardPending,
                unitTotal,
                deviceOnline: deviceOnlineCount,
                unitOnlineRate,
                deviceOnlineRate: deviceRateStr,
            },
            alarmTrend,
            deviceOnline,
            unitStatus,
            weeklyStats,
            shortcuts,
            todos,
            duty,
            summaryMonth: { alarmTotal: alarmMonth, handled: alarmMonthHandled, handleRate: monthHandledRate },
        };
    }
    static async buildWeeklyAlarmStats(now) {
        const weeklyStats = [];
        for (let w = 3; w >= 0; w -= 1) {
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end.setDate(end.getDate() - w * 7);
            end.setHours(23, 59, 59, 999);
            const start = new Date(end);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            const [alarms, handled] = await Promise.all([
                models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.between]: [start, end] } } }),
                models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.between]: [start, end] }, status: 2 } }),
            ]);
            weeklyStats.push({
                week: `${start.getMonth() + 1}/${start.getDate()}-${end.getMonth() + 1}/${end.getDate()}`,
                alarms,
                handled,
            });
        }
        return weeklyStats;
    }
    static async getMonitorOverview() {
        const [deviceStats, alarmStats, unitStats] = await Promise.all([
            models_1.Device.findAll({
                attributes: ['status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                group: ['status'], raw: true,
            }),
            models_1.Alarm.findAll({
                attributes: ['alarm_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                where: { status: 0 }, group: ['alarm_type'], raw: true,
            }),
            models_1.Unit.findAll({ attributes: ['unit_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']], group: ['unit_type'], raw: true }),
        ]);
        return { deviceStats, alarmStats, unitStats };
    }
    static async getBigScreenData() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [unitCount, deviceCount, onlineCount, alarmTotal, alarmToday, workOrderTotal, workOrderDone, patrolMonth, hazardTotal, inspectionMonth] = await Promise.all([
            models_1.Unit.count(), models_1.Device.count(), models_1.Device.count({ where: { status: 1 } }),
            models_1.Alarm.count(), models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart } } }),
            models_1.MaintenanceWorkOrder.count(), models_1.MaintenanceWorkOrder.count({ where: { status: 2 } }),
            models_1.PatrolRecord.count({ where: { created_at: { [sequelize_1.Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
            models_1.Hazard.count(), models_1.FireInspection.count({ where: { created_at: { [sequelize_1.Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
        ]);
        const recentAlarms = await models_1.Alarm.findAll({ limit: 20, order: [['created_at', 'DESC']], raw: true });
        const alarmTrend = await alarm_service_1.AlarmService.getTrend(7);
        return {
            summary: { unitCount, deviceCount, onlineCount, onlineRate: deviceCount ? ((onlineCount / deviceCount) * 100).toFixed(1) : 0, alarmTotal, alarmToday },
            workOrder: { total: workOrderTotal, done: workOrderDone },
            patrol: { month: patrolMonth }, hazard: { total: hazardTotal },
            inspection: { month: inspectionMonth },
            recentAlarms, alarmTrend,
        };
    }
}
exports.DashboardService = DashboardService;
//# sourceMappingURL=dashboard.service.js.map