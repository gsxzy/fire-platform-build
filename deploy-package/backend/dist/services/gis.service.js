"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GISService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
class GISService {
    // 获取地图点位数据
    static async getMapPoints() {
        const units = await models_1.Unit.findAll({
            attributes: ['id', 'unit_name', 'unit_type', 'address', 'lng', 'lat', 'status'],
            raw: true,
        });
        const devices = await models_1.Device.findAll({
            attributes: ['id', 'device_name', 'device_type', 'unit_id', 'install_location', 'lng', 'lat', 'status'],
            raw: true,
        });
        const activeAlarms = await models_1.Alarm.findAll({
            where: { status: 0 },
            attributes: ['id', 'alarm_type', 'alarm_level', 'device_name', 'unit_name', 'location'],
            raw: true,
        });
        return { units, devices, activeAlarms };
    }
    // 获取区域态势
    static async getRegionSituation() {
        const units = await models_1.Unit.findAll({ raw: true });
        const result = [];
        for (const unit of units) {
            const [deviceCount, onlineCount, alarmCount] = await Promise.all([
                models_1.Device.count({ where: { unit_id: unit.id } }),
                models_1.Device.count({ where: { unit_id: unit.id, status: 1 } }),
                models_1.Alarm.count({ where: { unit_id: unit.id, status: 0 } }),
            ]);
            result.push({
                ...unit, deviceCount, onlineCount, alarmCount,
                onlineRate: deviceCount ? ((onlineCount / deviceCount) * 100).toFixed(1) : 0,
            });
        }
        return result;
    }
    // 获取告警点位（地图弹窗用）
    static async getAlarmPoints() {
        return models_1.Alarm.findAll({
            where: { status: { [sequelize_1.Op.in]: [0, 1] } },
            attributes: ['id', 'alarm_no', 'alarm_type', 'alarm_level', 'device_name', 'unit_name', 'location', 'alarm_desc', 'created_at'],
            order: [['created_at', 'DESC']],
            limit: 100, raw: true,
        });
    }
    // 更新设备坐标
    static async updateDeviceLocation(deviceId, lng, lat) {
        await models_1.Device.update({ lng, lat }, { where: { id: deviceId } });
        return { success: true };
    }
}
exports.GISService = GISService;
//# sourceMappingURL=gis.service.js.map