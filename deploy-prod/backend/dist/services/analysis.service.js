"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const cache_1 = require("@/utils/cache");
class AnalysisService {
    // 设备运行数据分析
    static async deviceAnalysis(days = 30) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, `analysis:device:${days}`, async () => {
            const start = new Date();
            start.setDate(start.getDate() - days);
            const [byType, byStatus, onlineTrend, faultTrend] = await Promise.all([
                models_1.Device.findAll({
                    attributes: ['device_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    group: ['device_type'], raw: true,
                }),
                models_1.Device.findAll({
                    attributes: ['status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    group: ['status'], raw: true,
                }),
                this.getDeviceOnlineTrend(days),
                models_1.Alarm.findAll({
                    attributes: [[sequelize_1.Sequelize.fn('DATE', sequelize_1.Sequelize.col('created_at')), 'date'], [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    where: { created_at: { [sequelize_1.Op.gte]: start }, alarm_type: 2 },
                    group: [sequelize_1.Sequelize.fn('DATE', sequelize_1.Sequelize.col('created_at'))],
                    order: [[sequelize_1.Sequelize.fn('DATE', sequelize_1.Sequelize.col('created_at')), 'ASC']],
                    raw: true,
                }),
            ]);
            return { byType, byStatus, onlineTrend, faultTrend };
        }, { ttl: 120 });
    }
    // 告警频次分析
    static async alarmAnalysis(days = 30) {
        return (0, cache_1.withCache)(cache_1.CacheTags.ALARM_STATS, `analysis:alarm:${days}`, async () => {
            const start = new Date();
            start.setDate(start.getDate() - days);
            const [byType, byLevel, byHour, byUnit] = await Promise.all([
                models_1.Alarm.findAll({
                    attributes: ['alarm_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    where: { created_at: { [sequelize_1.Op.gte]: start } },
                    group: ['alarm_type'], raw: true,
                }),
                models_1.Alarm.findAll({
                    attributes: ['alarm_level', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    where: { created_at: { [sequelize_1.Op.gte]: start } },
                    group: ['alarm_level'], raw: true,
                }),
                models_1.Alarm.findAll({
                    attributes: [[sequelize_1.Sequelize.fn('HOUR', sequelize_1.Sequelize.col('created_at')), 'hour'], [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    where: { created_at: { [sequelize_1.Op.gte]: start } },
                    group: [sequelize_1.Sequelize.fn('HOUR', sequelize_1.Sequelize.col('created_at'))],
                    order: [[sequelize_1.Sequelize.fn('HOUR', sequelize_1.Sequelize.col('created_at')), 'ASC']],
                    raw: true,
                }),
                models_1.Alarm.findAll({
                    attributes: ['unit_name', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    where: { created_at: { [sequelize_1.Op.gte]: start } },
                    group: ['unit_name'], order: [[sequelize_1.Sequelize.fn('COUNT', '*'), 'DESC']], limit: 10, raw: true,
                }),
            ]);
            return { byType, byLevel, byHour, byUnit };
        }, { ttl: 120 });
    }
    // 维保数据分析
    static async maintenanceAnalysis() {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, 'analysis:maintenance', async () => {
            const [byStatus, byType, monthly] = await Promise.all([
                models_1.MaintenanceWorkOrder.findAll({
                    attributes: ['status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    group: ['status'], raw: true,
                }),
                models_1.MaintenanceWorkOrder.findAll({
                    attributes: ['order_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    group: ['order_type'], raw: true,
                }),
                models_1.MaintenanceWorkOrder.findAll({
                    attributes: [[sequelize_1.Sequelize.fn('DATE_FORMAT', sequelize_1.Sequelize.col('created_at'), '%Y-%m'), 'month'], [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    group: [sequelize_1.Sequelize.fn('DATE_FORMAT', sequelize_1.Sequelize.col('created_at'), '%Y-%m')],
                    order: [[sequelize_1.Sequelize.fn('DATE_FORMAT', sequelize_1.Sequelize.col('created_at'), '%Y-%m'), 'ASC']],
                    limit: 12, raw: true,
                }),
            ]);
            return { byStatus, byType, monthly };
        }, { ttl: 120 });
    }
    // 隐患规律分析
    static async hazardAnalysis() {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, 'analysis:hazard', async () => {
            const [byType, byLevel, byStatus, monthly] = await Promise.all([
                models_1.Hazard.findAll({ attributes: ['hazard_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']], group: ['hazard_type'], raw: true }),
                models_1.Hazard.findAll({ attributes: ['level', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']], group: ['level'], raw: true }),
                models_1.Hazard.findAll({ attributes: ['status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']], group: ['status'], raw: true }),
                models_1.Hazard.findAll({
                    attributes: [[sequelize_1.Sequelize.fn('DATE_FORMAT', sequelize_1.Sequelize.col('created_at'), '%Y-%m'), 'month'], [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                    group: [sequelize_1.Sequelize.fn('DATE_FORMAT', sequelize_1.Sequelize.col('created_at'), '%Y-%m')],
                    order: [[sequelize_1.Sequelize.fn('DATE_FORMAT', sequelize_1.Sequelize.col('created_at'), '%Y-%m'), 'ASC']],
                    limit: 12, raw: true,
                }),
            ]);
            return { byType, byLevel, byStatus, monthly };
        }, { ttl: 120 });
    }
    // 巡检完成率统计
    static async patrolCompletion(days = 30) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, `analysis:patrol:${days}`, async () => {
            const start = new Date();
            start.setDate(start.getDate() - days);
            const [total, normal, abnormal] = await Promise.all([
                models_1.PatrolRecord.count({ where: { created_at: { [sequelize_1.Op.gte]: start } } }),
                models_1.PatrolRecord.count({ where: { created_at: { [sequelize_1.Op.gte]: start }, result: 1 } }),
                models_1.PatrolRecord.count({ where: { created_at: { [sequelize_1.Op.gte]: start }, result: 2 } }),
            ]);
            return { total, normal, abnormal, rate: total ? ((normal / total) * 100).toFixed(1) : 0 };
        }, { ttl: 120 });
    }
    static async getDeviceOnlineTrend(days) {
        // 返回设备在线率趋势（当前在线率按天填充，非历史精确值）
        const [total, online] = await Promise.all([
            models_1.Device.count(),
            models_1.Device.count({ where: { status: 1 } }),
        ]);
        const rate = total ? ((online / total) * 100).toFixed(1) : 0;
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            result.push({ date: d.toISOString().slice(0, 10), rate });
        }
        return result;
    }
}
exports.AnalysisService = AnalysisService;
//# sourceMappingURL=analysis.service.js.map