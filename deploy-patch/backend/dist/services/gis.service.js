"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GISService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const cache_1 = require("@/utils/cache");
class GISService {
    // 获取地图点位数据
    static async getMapPoints() {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, 'gis:points', async () => {
            const [units, devices, activeAlarms] = await Promise.all([
                models_1.Unit.findAll({
                    attributes: ['id', 'unit_name', 'unit_type', 'address', 'lng', 'lat', 'status'],
                    raw: true,
                }),
                models_1.Device.findAll({
                    attributes: ['id', 'device_name', 'device_type', 'unit_id', 'install_location', 'lng', 'lat', 'status'],
                    raw: true,
                }),
                models_1.Alarm.findAll({
                    where: { status: 0 },
                    attributes: ['id', 'alarm_type', 'alarm_level', 'device_name', 'unit_name', 'location'],
                    raw: true,
                }),
            ]);
            return { units, devices, activeAlarms };
        }, { ttl: 30 });
    }
    // 获取区域态势（优化：单次聚合查询替代 N+1）
    static async getRegionSituation() {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, 'gis:region', async () => {
            const units = await models_1.Unit.findAll({ raw: true });
            if (units.length === 0)
                return [];
            const unitIds = units.map(u => u.id);
            const [deviceCounts, onlineCounts, alarmCounts] = await Promise.all([
                models_1.Device.findAll({
                    attributes: ['unit_id', [models_1.Device.sequelize.fn('COUNT', '*'), 'count']],
                    where: { unit_id: { [sequelize_1.Op.in]: unitIds } },
                    group: ['unit_id'],
                    raw: true,
                }),
                models_1.Device.findAll({
                    attributes: ['unit_id', [models_1.Device.sequelize.fn('COUNT', '*'), 'count']],
                    where: { unit_id: { [sequelize_1.Op.in]: unitIds }, status: 1 },
                    group: ['unit_id'],
                    raw: true,
                }),
                models_1.Alarm.findAll({
                    attributes: ['unit_id', [models_1.Alarm.sequelize.fn('COUNT', '*'), 'count']],
                    where: { unit_id: { [sequelize_1.Op.in]: unitIds }, status: 0 },
                    group: ['unit_id'],
                    raw: true,
                }),
            ]);
            const deviceCountMap = new Map(deviceCounts.map(d => [String(d.unit_id), Number(d.count)]));
            const onlineCountMap = new Map(onlineCounts.map(d => [String(d.unit_id), Number(d.count)]));
            const alarmCountMap = new Map(alarmCounts.map(d => [String(d.unit_id), Number(d.count)]));
            return units.map(unit => {
                const deviceCount = deviceCountMap.get(String(unit.id)) || 0;
                const onlineCount = onlineCountMap.get(String(unit.id)) || 0;
                const alarmCount = alarmCountMap.get(String(unit.id)) || 0;
                return {
                    ...unit,
                    deviceCount,
                    onlineCount,
                    alarmCount,
                    onlineRate: deviceCount ? ((onlineCount / deviceCount) * 100).toFixed(1) : 0,
                };
            });
        }, { ttl: 30 });
    }
    // 获取告警点位（地图弹窗用）
    static async getAlarmPoints() {
        return (0, cache_1.withCache)(cache_1.CacheTags.ALARM_STATS, 'gis:alarm-points', async () => {
            return models_1.Alarm.findAll({
                where: { status: { [sequelize_1.Op.in]: [0, 1] } },
                attributes: ['id', 'alarm_no', 'alarm_type', 'alarm_level', 'device_name', 'unit_name', 'location', 'alarm_desc', 'created_at'],
                order: [['created_at', 'DESC']],
                limit: 100, raw: true,
            });
        }, { ttl: 30 });
    }
    // 获取告警热力图数据
    static async getAlarmHeatmap() {
        return (0, cache_1.withCache)(cache_1.CacheTags.ALARM_STATS, 'gis:alarm-heatmap', async () => {
            const alarms = await models_1.Alarm.findAll({
                where: { status: { [sequelize_1.Op.in]: [0, 1] } },
                attributes: ['id', 'alarm_level', 'lng', 'lat'],
                raw: true,
            });
            return alarms
                .filter(a => a.lng != null && a.lat != null && !Number.isNaN(Number(a.lng)) && !Number.isNaN(Number(a.lat)))
                .map(a => ({
                lng: Number(a.lng),
                lat: Number(a.lat),
                weight: a.alarm_level === 3 ? 1.0 : a.alarm_level === 2 ? 0.7 : 0.4,
            }));
        }, { ttl: 30 });
    }
    // 更新设备坐标
    static async updateDeviceLocation(deviceId, lng, lat) {
        await models_1.Device.update({ lng, lat }, { where: { id: deviceId } });
        return { success: true };
    }
}
exports.GISService = GISService;
//# sourceMappingURL=gis.service.js.map