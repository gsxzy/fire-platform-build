"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmController = void 0;
const sequelize_1 = require("sequelize");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const database_1 = __importDefault(require("@/config/database"));
const redis_1 = __importDefault(require("@/config/redis"));
const websocket_service_1 = require("@/websocket/websocket.service");
const deviceControl_service_1 = require("@/services/deviceControl.service");
const linkage_service_1 = require("@/services/linkage.service");
const riskAnalysis_service_1 = require("@/services/ai/riskAnalysis.service");
const logger_1 = __importDefault(require("@/config/logger"));
const alarmNo_1 = require("@/utils/alarmNo");
const validator_1 = require("@/utils/validator");
/** 格式化 Date 为本地时间字符串 yyyy-MM-dd HH:mm:ss */
function fmtDateTime(date) {
    if (!date)
        return '';
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
}
exports.AlarmController = {
    async getDetail(req, res) {
        try {
            const { id } = req.params;
            const alarm = await models_1.Alarm.findByPk(id, {
                include: [{ model: models_1.Device, as: 'device', required: false }],
            });
            if (!alarm)
                return res.status(404).json((0, response_1.fail)('告警不存在', 404));
            const data = alarm.toJSON ? alarm.toJSON() : alarm;
            // 补充 unit_id / unit_name
            let unitId = data.unit_id;
            let unitName = data.unit_name;
            if (!unitId && data.device?.unit_id)
                unitId = data.device.unit_id;
            if (!unitName && data.device?.unit_name)
                unitName = data.device.unit_name;
            // 查询单位详情
            let unit = null;
            if (unitId) {
                try {
                    unit = await models_1.Unit.findByPk(unitId, { raw: true });
                }
                catch (e) { /* ignore */ }
                if (unit && !unitName)
                    unitName = unit.unit_name;
            }
            // 查询消控室
            let controlRoom = null;
            if (unitId) {
                try {
                    const [crRows] = await database_1.default.query(`SELECT * FROM fire_control_room WHERE unit_id = ? LIMIT 1`, { replacements: [unitId] });
                    controlRoom = crRows[0] || null;
                }
                catch (e) { /* ignore */ }
            }
            // 查询关联摄像头
            let cameras = [];
            if (unitId) {
                try {
                    const [camRows] = await database_1.default.query(`SELECT id, name, location, rtsp_url, stream_url, device_id, channel_id, online_status 
             FROM cameras WHERE unit_id = ? LIMIT 10`, { replacements: [String(unitId)] });
                    cameras = camRows || [];
                }
                catch (e) { /* ignore */ }
            }
            // 查询平面图位置
            let floorPlan = null;
            if (data.device_id) {
                try {
                    const [fpRows] = await database_1.default.query(`SELECT f.id as floor_id, f.floor_name, f.floor_no, f.image_url,
                    b.id as building_id, b.building_name,
                    dp.x, dp.y
             FROM fire_floor_device_position dp
             JOIN fire_floor f ON f.id = dp.floor_id
             JOIN fire_building b ON b.id = f.building_id
             WHERE dp.device_id = ?
             LIMIT 1`, { replacements: [data.device_id] });
                    floorPlan = fpRows[0] || null;
                }
                catch (e) { /* ignore */ }
            }
            if (data.createdAt)
                data.createdAt = fmtDateTime(data.createdAt);
            if (data.updatedAt)
                data.updatedAt = fmtDateTime(data.updatedAt);
            // 映射 controlRoom 为前端期望的 camelCase 字段
            const mappedControlRoom = controlRoom ? {
                roomName: controlRoom.room_name,
                dutyPerson: controlRoom.duty_person,
                dutyPhone: controlRoom.duty_phone,
                managerName: controlRoom.duty_person,
                managerPhone: controlRoom.duty_phone,
                dutyOfficerName: controlRoom.duty_person,
                dutyOfficerPhone: controlRoom.duty_phone,
                safetyOfficerName: controlRoom.duty_person,
                safetyOfficerPhone: controlRoom.duty_phone,
                videoUrl: controlRoom.video_url,
            } : null;
            return res.json((0, response_1.success)({
                ...data,
                unit_id: unitId,
                unit_name: unitName,
                unit,
                controlRoom: mappedControlRoom,
                relatedCameras: cameras,
                floorPlan,
            }));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] getDetail 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`获取告警详情失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async list(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { alarmType, alarmLevel, status, unitId, keyword, startTime, endTime } = req.query;
            const where = {};
            if (alarmType)
                where.alarm_type = alarmType;
            if (alarmLevel)
                where.alarm_level = alarmLevel;
            if (status !== undefined)
                where.status = status;
            if (unitId)
                where.unit_id = unitId;
            if (keyword)
                where[sequelize_1.Op.or] = [{ alarm_no: { [sequelize_1.Op.like]: `%${keyword}%` } }, { device_name: { [sequelize_1.Op.like]: `%${keyword}%` } }];
            if (startTime && endTime)
                where.created_at = { [sequelize_1.Op.between]: [startTime, endTime] };
            const { count, rows } = await models_1.Alarm.findAndCountAll({
                where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize,
                order: [['created_at', 'DESC']],
                include: [
                    {
                        model: models_1.Device,
                        as: 'device',
                        attributes: ['id', 'device_no', 'device_name', 'unit_id'],
                        required: false,
                        include: [{ model: models_1.Unit, as: 'unit', attributes: ['id', 'unit_name'], required: false }],
                    },
                ],
            });
            // 补充 unit_name：优先告警记录自身，其次取设备档案关联的单位
            const enriched = rows.map((r) => {
                const data = r.toJSON ? r.toJSON() : r;
                if (!data.unit_name && data.device?.unit?.unit_name) {
                    data.unit_name = data.device.unit.unit_name;
                }
                if (!data.unit_id && data.device?.unit_id) {
                    data.unit_id = data.device.unit_id;
                }
                // 格式化时间为本地可读字符串
                if (data.createdAt)
                    data.createdAt = fmtDateTime(data.createdAt);
                if (data.updatedAt)
                    data.updatedAt = fmtDateTime(data.updatedAt);
                return data;
            });
            return res.json((0, response_1.page)(enriched, count, +pageNum, +pageSize));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] list 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async stats(req, res) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const [total, todayCount, pending, byType, byLevel] = await Promise.all([
                models_1.Alarm.count(),
                models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: today } } }),
                models_1.Alarm.count({ where: { status: 0 } }),
                models_1.Alarm.findAll({ attributes: ['alarm_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']], group: ['alarm_type'], raw: true }),
                models_1.Alarm.findAll({ attributes: ['alarm_level', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']], group: ['alarm_level'], raw: true }),
            ]);
            return res.json((0, response_1.success)({ total, today: todayCount, pending, byType, byLevel }));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] stats 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async create(req, res) {
        try {
            const alarmNo = (0, alarmNo_1.generateAlarmNo)();
            const alarm = await models_1.Alarm.create({ ...req.body, alarm_no: alarmNo });
            // 1. Redis发布
            await redis_1.default.publish('fire:alarm', JSON.stringify({ type: 'new_alarm', data: alarm }));
            // 2. WebSocket广播
            await websocket_service_1.WebSocketService.broadcastAlarm(alarm);
            // 3. AI风险分析（异步）
            riskAnalysis_service_1.AIAriskAnalysisService.analyzeAlarm(alarm.id)
                .catch(err => logger_1.default.error(`[Alarm] AI分析失败: ${err.message}`));
            // 4. 触发联动（异步）
            linkage_service_1.LinkageService.triggerLinkage(alarm.id, req.user?.userId, req.user?.username)
                .catch(err => logger_1.default.error(`[Alarm] 联动触发失败: ${err.message}`));
            logger_1.default.info(`[Alarm] 新告警: ${alarmNo}, type=${alarm.alarm_type}`);
            return res.json((0, response_1.success)({ id: alarm.id }, '告警上报成功'));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] create 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async confirm(req, res) {
        try {
            const { id } = req.params;
            await models_1.Alarm.update({ status: 1, confirm_time: new Date() }, { where: { id } });
            return res.json((0, response_1.success)(null, '已确认'));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] confirm 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async handle(req, res) {
        try {
            const { id } = req.params;
            const { handleResult } = req.body;
            await models_1.Alarm.update({
                status: 2, handle_time: new Date(),
                handler_id: req.user.userId, handler_name: req.user.username,
                handle_result: handleResult
            }, { where: { id } });
            return res.json((0, response_1.success)(null, '处理完成'));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] handle 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async dismiss(req, res) {
        try {
            const { id } = req.params;
            await models_1.Alarm.update({ status: 3 }, { where: { id } });
            return res.json((0, response_1.success)(null, '已标记为误报'));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] dismiss 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /** 告警消音：联动设备反控消音（需关联 device_id） */
    async silence(req, res) {
        try {
            const { id } = req.params;
            const alarm = await models_1.Alarm.findByPk(id);
            if (!alarm)
                return res.json((0, response_1.fail)('告警不存在'));
            if (!alarm.device_id) {
                return res.json((0, response_1.success)(null, '已记录消音（无关联设备，未下发主机指令）'));
            }
            const result = await deviceControl_service_1.DeviceControlService.silence(+alarm.device_id, req.user.userId, req.user.username);
            return res.json((0, response_1.success)(result, result.message));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] silence 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async recent(req, res) {
        try {
            const alarms = await models_1.Alarm.findAll({ limit: 10, order: [['created_at', 'DESC']] });
            return res.json((0, response_1.success)(alarms));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] recent 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async trend(req, res) {
        try {
            const days = parseInt(req.query.days) || 7;
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            const start = new Date(end);
            start.setDate(start.getDate() - days + 1);
            start.setHours(0, 0, 0, 0);
            const rows = await models_1.Alarm.findAll({
                attributes: [
                    [sequelize_1.Sequelize.fn('DATE', sequelize_1.Sequelize.col('created_at')), 'date'],
                    [sequelize_1.Sequelize.fn('COUNT', '*'), 'count'],
                ],
                where: {
                    created_at: { [sequelize_1.Op.gte]: start, [sequelize_1.Op.lte]: end },
                },
                group: [sequelize_1.Sequelize.fn('DATE', sequelize_1.Sequelize.col('created_at'))],
                raw: true,
            });
            // 按原代码的日期格式化规则构建映射（本地日期 00:00:00 的 UTC 日期字符串）
            const countMap = new Map();
            for (const r of rows) {
                const [y, m, d] = String(r.date).split('-').map(Number);
                const localMidnight = new Date(y, m - 1, d);
                const dateStr = localMidnight.toISOString().slice(0, 10);
                countMap.set(dateStr, Number(r.count) || 0);
            }
            const result = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                d.setHours(0, 0, 0, 0);
                const dateStr = d.toISOString().slice(0, 10);
                result.push({ date: dateStr, count: countMap.get(dateStr) || 0 });
            }
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[Alarm] trend 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=alarm.controller.js.map