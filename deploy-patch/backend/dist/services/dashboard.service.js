"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const alarm_service_1 = require("./alarm.service");
const duty_service_1 = require("./duty.service");
const cache_1 = require("@/utils/cache");
class DashboardService {
    static async getWorkbenchData(userId) {
        // 工作台数据缓存15秒，避免高频刷新导致数据库压力
        return (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, `workbench:${userId}`, async () => {
            return DashboardService._fetchWorkbenchData(userId);
        }, { ttl: 15 });
    }
    static async _fetchWorkbenchData(userId) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [alarmPending, alarmToday, deviceTotal, deviceOnlineCount, deviceActiveTotal, deviceActiveOnline, workOrderPending, patrolToday, hazardPending, unitTotal, inspectionMonth, userCount, todayFire, todayFault, alarmMonth, alarmMonthHandled,] = await Promise.all([
            models_1.Alarm.count({ where: { status: 0 } }),
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart } } }),
            models_1.Device.count(),
            models_1.Device.count({ where: { status: 1 } }),
            models_1.Device.count({ where: { unit_id: { [sequelize_1.Op.ne]: null } } }),
            models_1.Device.count({ where: { unit_id: { [sequelize_1.Op.ne]: null }, status: 1 } }),
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
                where: { unit_id: { [sequelize_1.Op.ne]: null } },
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
        if (deviceOnline.length === 0 && deviceActiveTotal > 0) {
            deviceOnline = [{ name: '全部设备', total: deviceActiveTotal, online: deviceActiveOnline }];
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
                activeTotal: deviceActiveTotal,
                activeOnline: deviceActiveOnline,
                activeOffline: deviceActiveTotal - deviceActiveOnline,
                activeRate: deviceActiveTotal ? ((deviceActiveOnline / deviceActiveTotal) * 100).toFixed(1) : '0',
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
                deviceActiveTotal,
                deviceActiveOnline,
                deviceActiveRate: deviceActiveTotal ? ((deviceActiveOnline / deviceActiveTotal) * 100).toFixed(1) : '0',
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
        // 使用单条 SQL 替代 8 次 sequential count，按周分组统计
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(start.getDate() - 27); // 4周前
        start.setHours(0, 0, 0, 0);
        const rows = await models_1.Alarm.sequelize.query(`SELECT
         FLOOR(DATEDIFF(created_at, ?) / 7) AS week_idx,
         COUNT(*) AS alarms,
         SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS handled
       FROM fire_alarm
       WHERE created_at BETWEEN ? AND ?
       GROUP BY week_idx
       ORDER BY week_idx`, { replacements: [start, start, end], type: 'SELECT' });
        const weeklyStats = [];
        for (let w = 3; w >= 0; w -= 1) {
            const weekEnd = new Date(end);
            weekEnd.setDate(weekEnd.getDate() - w * 7);
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekStart.getDate() - 6);
            const row = rows.find(r => r.week_idx === 3 - w);
            weeklyStats.push({
                week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
                alarms: row ? Number(row.alarms) : 0,
                handled: row ? Number(row.handled) : 0,
            });
        }
        return weeklyStats;
    }
    static async getMonitorOverview() {
        // 监控概览缓存10秒
        return (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, 'monitor:overview', async () => {
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
        }, { ttl: 10 });
    }
    static async getBigScreenData() {
        // 大屏数据缓存10秒，减少高频轮询压力
        return (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, 'bigscreen', async () => {
            return DashboardService._fetchBigScreenData();
        }, { ttl: 10 });
    }
    static async _fetchBigScreenData() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [unitCount, deviceCount, onlineCount, alarmTotal, alarmToday, workOrderTotal, workOrderDone, patrolMonth, hazardTotal, inspectionMonth] = await Promise.all([
            models_1.Unit.count(), models_1.Device.count(), models_1.Device.count({ where: { status: 1 } }),
            models_1.Alarm.count(), models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart } } }),
            models_1.MaintenanceWorkOrder.count(), models_1.MaintenanceWorkOrder.count({ where: { status: 2 } }),
            models_1.PatrolRecord.count({ where: { created_at: { [sequelize_1.Op.gte]: monthStart } } }),
            models_1.Hazard.count(), models_1.FireInspection.count({ where: { created_at: { [sequelize_1.Op.gte]: monthStart } } }),
        ]);
        const [recentAlarmsRaw, alarmTrend, hourlyDataRaw, unitAlarmRaw, deviceTypeRaw, subsystemsRaw] = await Promise.all([
            models_1.Alarm.findAll({ limit: 20, order: [['created_at', 'DESC']], raw: true }),
            alarm_service_1.AlarmService.getTrend(7),
            this.buildHourlyAlarmStats(now),
            models_1.Alarm.findAll({
                attributes: ['unit_name', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                where: { created_at: { [sequelize_1.Op.gte]: monthStart } },
                group: ['unit_name'],
                order: [[sequelize_1.Sequelize.fn('COUNT', '*'), 'DESC']],
                limit: 10,
                raw: true,
            }),
            models_1.Device.findAll({
                attributes: ['device_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                group: ['device_type'],
                raw: true,
            }),
            models_1.Subsystem.findAll({ where: { status: 1 }, order: [['sort_order', 'ASC']], raw: true }),
        ]);
        const recentAlarms = recentAlarmsRaw.map(a => ({
            device: a.device_name || '未知设备',
            unit: a.unit_name || '未知单位',
            time: a.created_at ? new Date(a.created_at).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--',
            type: a.alarm_type === 1 ? '火警' : a.alarm_type === 2 ? '故障' : '监管',
            level: a.alarm_level === 3 ? '紧急' : a.alarm_level === 2 ? '重要' : '一般',
        }));
        const unitAlarmData = unitAlarmRaw.map((r) => ({
            name: r.unit_name || '未命名单位',
            value: Number(r.count),
        }));
        const deviceColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
        const deviceTypeDist = deviceTypeRaw.map((r, i) => ({
            name: r.device_type || '未分类',
            value: Number(r.count),
            color: deviceColors[i % deviceColors.length],
        }));
        const subsystemStatusMap = {
            water: '消防给水', elec: '电气火灾', vent: '防排烟',
            light: '应急照明', audio: '消防广播', door: '防火门', gas: '气体灭火',
        };
        const systems = subsystemsRaw.map((s) => ({
            name: s.name || subsystemStatusMap[s.type] || s.type,
            status: '正常',
            color: s.type === 'water' ? '#3b82f6' : s.type === 'elec' ? '#f59e0b' : s.type === 'vent' ? '#10b981' : '#64748b',
        }));
        return {
            summary: { unitCount, deviceCount, onlineCount, onlineRate: deviceCount ? ((onlineCount / deviceCount) * 100).toFixed(1) : 0, alarmTotal, alarmToday },
            workOrder: { total: workOrderTotal, done: workOrderDone },
            patrol: { month: patrolMonth }, hazard: { total: hazardTotal },
            inspection: { month: inspectionMonth },
            recentAlarms, alarmTrend,
            hourlyData: hourlyDataRaw,
            unitAlarmData,
            deviceTypeDist,
            systems: systems.length > 0 ? systems : [
                { name: '消防给水', status: '正常', color: '#3b82f6' },
                { name: '电气火灾', status: '正常', color: '#f59e0b' },
                { name: '防排烟', status: '正常', color: '#10b981' },
                { name: '应急照明', status: '正常', color: '#8b5cf6' },
                { name: '消防广播', status: '正常', color: '#06b6d4' },
                { name: '防火门', status: '正常', color: '#ec4899' },
            ],
        };
    }
    static async buildHourlyAlarmStats(now) {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const rows = await models_1.Alarm.sequelize.query(`SELECT
         HOUR(created_at) AS hr,
         SUM(CASE WHEN alarm_type = 1 THEN 1 ELSE 0 END) AS alarm,
         SUM(CASE WHEN alarm_type = 2 THEN 1 ELSE 0 END) AS fault
       FROM fire_alarm
       WHERE created_at >= ? AND created_at < ?
       GROUP BY hr
       ORDER BY hr`, { replacements: [todayStart, tomorrowStart], type: 'SELECT' });
        const map = new Map();
        for (const r of rows)
            map.set(r.hr, { alarm: Number(r.alarm), fault: Number(r.fault) });
        const hours = [];
        for (let h = 0; h < 24; h++) {
            const data = map.get(h);
            hours.push({ hour: `${String(h).padStart(2, '0')}:00`, alarm: data?.alarm || 0, fault: data?.fault || 0 });
        }
        return hours;
    }
    static async getBigScreenConfig() {
        const config = await models_1.ScreenConfig.findOne({ where: { status: 1 }, order: [['id', 'ASC']] });
        if (!config)
            return null;
        const widgets = await models_1.ScreenWidget.findAll({ where: { screen_id: config.id, status: 1 }, order: [['position_y', 'ASC'], ['position_x', 'ASC']], raw: true });
        return {
            screenName: config.screen_name,
            layout: config.layout_config ? JSON.parse(config.layout_config) : { layout: 'grid', cols: 3, rows: 2 },
            widgets: widgets.map(w => ({
                type: w.widget_type,
                name: w.widget_name,
                config: w.config ? JSON.parse(w.config) : {},
                x: w.position_x,
                y: w.position_y,
                width: w.width,
                height: w.height,
            })),
        };
    }
}
exports.DashboardService = DashboardService;
//# sourceMappingURL=dashboard.service.js.map