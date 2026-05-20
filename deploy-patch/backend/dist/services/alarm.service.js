"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmService = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
const models_1 = require("@/models");
const redis_1 = __importDefault(require("@/config/redis"));
const alarmNo_1 = require("@/utils/alarmNo");
const logger_1 = __importDefault(require("@/config/logger"));
const cache_1 = require("@/utils/cache");
class AlarmService {
    // 创建告警并触发推送
    static async createAlarm(data) {
        // ── 编码表关联：若含回路号+点位号，尝试从 fire_host_device_code 补全设备名称和位置 ──
        if (data.loop_no !== undefined && data.loop_no !== null && data.address !== undefined && data.address !== null) {
            try {
                let hostId = null;
                // 方式1：通过 host_code 直接查找主机
                if (data.host_code) {
                    const [hostRows] = await database_1.default.query(`SELECT id FROM fire_control_room_host WHERE host_no = ? LIMIT 1`, { replacements: [String(data.host_code)] });
                    if (hostRows?.[0]?.id)
                        hostId = hostRows[0].id;
                }
                // 方式2：通过 device_id → unit_id → room_id → host_id
                if (!hostId && data.device_id) {
                    const [hostRows] = await database_1.default.query(`SELECT h.id FROM fire_control_room_host h
             INNER JOIN fire_control_room r ON h.room_id = r.id
             INNER JOIN fire_device d ON d.unit_id = r.unit_id
             WHERE d.id = ? LIMIT 1`, { replacements: [Number(data.device_id)] });
                    if (hostRows?.[0]?.id)
                        hostId = hostRows[0].id;
                }
                // 方式3：通过 unit_id → room_id → host_id
                if (!hostId && data.unit_id) {
                    const [hostRows] = await database_1.default.query(`SELECT h.id FROM fire_control_room_host h
             INNER JOIN fire_control_room r ON h.room_id = r.id
             WHERE r.unit_id = ? LIMIT 1`, { replacements: [Number(data.unit_id)] });
                    if (hostRows?.[0]?.id)
                        hostId = hostRows[0].id;
                }
                if (hostId) {
                    const [codeRows] = await database_1.default.query(`SELECT device_name, install_location, device_type
             FROM fire_host_device_code
             WHERE host_id = ? AND loop_no = ? AND point_no = ? LIMIT 1`, { replacements: [hostId, Number(data.loop_no), Number(data.address)] });
                    const code = codeRows?.[0];
                    if (code) {
                        if (code.device_name && (!data.device_name || data.device_name === data.device_sn)) {
                            data.device_name = code.device_name;
                        }
                        if (code.install_location) {
                            data.location = code.install_location;
                        }
                        if (code.device_type && !data.device_type) {
                            data.device_type = code.device_type;
                        }
                        logger_1.default.info(`[AlarmService] 编码表关联成功: host=${hostId} loop=${data.loop_no} point=${data.address} → ${code.device_name} @ ${code.install_location}`);
                    }
                }
            }
            catch (err) {
                logger_1.default.warn(`[AlarmService] 编码表关联失败: ${err.message}`);
            }
        }
        const alarmNo = (0, alarmNo_1.generateAlarmNo)();
        const alarm = await models_1.Alarm.create({ ...data, alarm_no: alarmNo, status: 0 });
        // ── 自动创建接警处置记录（值守中心联动）──
        try {
            const { DispatchService } = await Promise.resolve().then(() => __importStar(require('@/services/dispatch.service')));
            await DispatchService.createFromAlarm({ ...data, id: alarm.id, alarm_no: alarmNo });
        }
        catch (dispatchErr) {
            logger_1.default.warn(`[AlarmService] 自动创建接警记录失败: ${dispatchErr.message}`);
        }
        // 转换为前端期望的 camelCase 格式
        const raw = alarm.toJSON ? alarm.toJSON() : alarm;
        // 数值 → 字符串映射（前端 AlarmPopup / AlarmDetailModal 依赖这些字段）
        const typeMap = { 1: 'fire', 2: 'fault', 3: 'warning', 4: 'supervisory', 5: 'test' };
        const levelMap = { 1: 'low', 2: 'normal', 3: 'high' };
        const payload = {
            ...raw,
            // camelCase 兼容
            unitName: raw.unit_name ?? raw.unitName ?? null,
            unitId: raw.unit_id ?? raw.unitId ?? null,
            deviceName: raw.device_name ?? raw.deviceName ?? null,
            deviceId: raw.device_id ?? raw.deviceId ?? null,
            alarmType: raw.alarm_type ?? raw.alarmType ?? null,
            alarmLevel: raw.alarm_level ?? raw.alarmLevel ?? null,
            alarmNo: raw.alarm_no ?? raw.alarmNo ?? null,
            alarmDesc: raw.alarm_desc ?? raw.alarmDesc ?? null,
            createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
            updatedAt: raw.updatedAt || raw.updated_at || null,
            loopNo: raw.loop_no ?? raw.loopNo ?? null,
            address: raw.address ?? null,
            hostCode: raw.host_code ?? raw.hostCode ?? null,
            rawData: raw.raw_data ?? raw.rawData ?? null,
            handlerId: raw.handler_id ?? raw.handlerId ?? null,
            handlerName: raw.handler_name ?? raw.handlerName ?? null,
            handleTime: raw.handle_time ?? raw.handleTime ?? null,
            handleResult: raw.handle_result ?? raw.handleResult ?? null,
            confirmTime: raw.confirm_time ?? raw.confirmTime ?? null,
            pushStatus: raw.push_status ?? raw.pushStatus ?? null,
            // 字符串类型/级别（前端 LEVEL_MAP / TYPE_MAP 使用）
            type: typeMap[raw.alarm_type] ?? 'warning',
            level: levelMap[raw.alarm_level] ?? 'normal',
            // 设备类型名称（前端 AlarmDetailModal 使用 alarm.code）
            code: data.code || data.device_type_name || raw.device_type_name || undefined,
        };
        await redis_1.default.publish('fire:alarm', JSON.stringify({ type: 'new_alarm', data: payload }));
        return alarm;
    }
    // 告警处理闭环
    static async handleAlarm(id, userId, userName, result) {
        await models_1.Alarm.update({
            status: 2, handle_time: new Date(),
            handler_id: userId, handler_name: userName, handle_result: result
        }, { where: { id } });
        return { success: true };
    }
    // 告警确认
    static async confirmAlarm(id) {
        await models_1.Alarm.update({ status: 1, confirm_time: new Date() }, { where: { id } });
        return { success: true };
    }
    // 告警趋势统计（单次聚合查询，替代循环 N+1）
    static async getTrend(days = 7) {
        return (0, cache_1.withCache)(cache_1.CacheTags.ALARM_STATS, `trend:${days}`, async () => {
            const start = new Date();
            start.setDate(start.getDate() - days + 1);
            start.setHours(0, 0, 0, 0);
            const rows = await models_1.Alarm.findAll({
                attributes: [
                    [sequelize_1.Sequelize.fn('DATE', sequelize_1.Sequelize.col('created_at')), 'date'],
                    [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.literal("CASE WHEN alarm_type = 1 THEN 1 ELSE 0 END")), 'fire'],
                    [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.literal("CASE WHEN alarm_type = 2 THEN 1 ELSE 0 END")), 'fault'],
                    [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.literal("CASE WHEN alarm_type = 3 THEN 1 ELSE 0 END")), 'pre'],
                ],
                where: { created_at: { [sequelize_1.Op.gte]: start } },
                group: [sequelize_1.Sequelize.fn('DATE', sequelize_1.Sequelize.col('created_at'))],
                raw: true,
            });
            const countMap = new Map();
            for (const r of rows) {
                const dateStr = String(r.date).slice(0, 10);
                countMap.set(dateStr, {
                    fire: Number(r.fire) || 0,
                    fault: Number(r.fault) || 0,
                    pre: Number(r.pre) || 0,
                });
            }
            const result = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                d.setHours(0, 0, 0, 0);
                const dateStr = d.toISOString().slice(0, 10);
                const counts = countMap.get(dateStr);
                result.push({ date: dateStr, fire: counts?.fire || 0, fault: counts?.fault || 0, pre: counts?.pre || 0 });
            }
            return result;
        }, { ttl: 120 });
    }
    // 告警分级统计
    static async getLevelStats() {
        return (0, cache_1.withCache)(cache_1.CacheTags.ALARM_STATS, 'alarm:levelStats', async () => {
            return models_1.Alarm.findAll({
                attributes: ['alarm_level', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                group: ['alarm_level'], raw: true,
            });
        }, { ttl: 120 });
    }
    // 单位告警排行
    static async getUnitAlarmRank(limit = 10) {
        return (0, cache_1.withCache)(cache_1.CacheTags.ALARM_STATS, `alarm:unitRank:${limit}`, async () => {
            return models_1.Alarm.findAll({
                attributes: ['unit_name', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                group: ['unit_name'], order: [[sequelize_1.Sequelize.fn('COUNT', '*'), 'DESC']],
                limit, raw: true,
            });
        }, { ttl: 120 });
    }
    // 消音
    static async silenceAlarm(id) {
        await models_1.Alarm.update({ push_status: 1 }, { where: { id } });
        return { success: true };
    }
    // 批量处理
    static async batchHandle(ids, userId, userName, result) {
        await models_1.Alarm.update({
            status: 2, handle_time: new Date(),
            handler_id: userId, handler_name: userName, handle_result: result
        }, { where: { id: { [sequelize_1.Op.in]: ids } } });
        return { success: true, count: ids.length };
    }
}
exports.AlarmService = AlarmService;
//# sourceMappingURL=alarm.service.js.map