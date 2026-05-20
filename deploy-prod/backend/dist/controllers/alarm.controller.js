"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmController = void 0;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const httpError_1 = require("@/utils/httpError");
const models_1 = require("@/models");
const database_1 = __importDefault(require("@/config/database"));
const redis_1 = __importDefault(require("@/config/redis"));
const websocket_service_1 = require("@/websocket/websocket.service");
const deviceControl_service_1 = require("@/services/deviceControl.service");
const linkage_service_1 = require("@/services/linkage.service");
const riskAnalysis_service_1 = require("@/services/ai/riskAnalysis.service");
const alarm_service_1 = require("@/services/alarm.service");
const logger_1 = __importDefault(require("@/config/logger"));
const alarmNo_1 = require("@/utils/alarmNo");
const validator_1 = require("@/utils/validator");
const cache_1 = require("@/utils/cache");
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
        const { id } = req.params;
        const alarm = await models_1.Alarm.findByPk(id, {
            include: [{ model: models_1.Device, as: 'device', required: false }],
        });
        if (!alarm)
            throw new httpError_1.HttpError('告警不存在', 404);
        const data = alarm.toJSON ? alarm.toJSON() : alarm;
        // 补充 unit_id / unit_name / location / device_name
        let unitId = data.unit_id;
        let unitName = data.unit_name;
        let location = data.location;
        let deviceName = data.device_name;
        if (!unitId && data.device?.unit_id)
            unitId = data.device.unit_id;
        // Device 模型无 unit_name 字段，此处 unit_name 回退无效，由下方 Unit.findByPk 补救
        if ((!location || location === '') && data.device?.install_location)
            location = data.device.install_location;
        if ((!deviceName || deviceName === '') && data.device?.device_name)
            deviceName = data.device.device_name;
        // 历史报警补救：若 device_id 为 NULL 但 device_name 有值，尝试通过 IoT 设备反查档案
        if (!data.device_id && deviceName) {
            try {
                const [iotRows] = await database_1.default.query(`SELECT archive_device_id FROM fire_iot_device WHERE device_name = ? OR device_sn = ? LIMIT 1`, { replacements: [deviceName, deviceName] });
                const archiveId = iotRows?.[0]?.archive_device_id;
                if (archiveId) {
                    const [devRows] = await database_1.default.query(`SELECT id, device_name, unit_id, install_location FROM fire_device WHERE id = ? LIMIT 1`, { replacements: [archiveId] });
                    const dev = devRows?.[0];
                    if (dev) {
                        if (!unitId && dev.unit_id)
                            unitId = dev.unit_id;
                        if ((!location || location === '') && dev.install_location)
                            location = dev.install_location;
                        if ((!deviceName || deviceName === '') && dev.device_name)
                            deviceName = dev.device_name;
                    }
                }
            }
            catch { /* ignore */ }
        }
        // 并行查询：单位、消控室、摄像头、平面图、处置记录（减少数据库往返）
        let unit = null, controlRoom = null, cameras = [], floorPlan = null, dispatchRecords = [];
        const parallelQueries = [];
        if (unitId) {
            parallelQueries.push(models_1.Unit.findByPk(unitId, { raw: true }).then((u) => { unit = u; if (u && !unitName)
                unitName = u.unit_name; }).catch(() => { }), database_1.default.query(`SELECT * FROM fire_control_room WHERE unit_id = ? LIMIT 1`, { replacements: [unitId] })
                .then(([rows]) => { controlRoom = rows?.[0] || null; }).catch(() => { }), database_1.default.query(`SELECT id, name, location, rtsp_url, stream_url, device_id, channel_id, online_status FROM cameras WHERE unit_id = ? LIMIT 10`, { replacements: [String(unitId)] }).then(([rows]) => { cameras = rows || []; }).catch(() => { }));
        }
        if (data.device_id) {
            parallelQueries.push(database_1.default.query(`SELECT f.id as floor_id, f.floor_name, f.floor_no, f.image_url,
                    b.id as building_id, b.building_name, dp.x, dp.y
             FROM fire_floor_device_position dp
             JOIN fire_floor f ON f.id = dp.floor_id
             JOIN fire_building b ON b.id = f.building_id
             WHERE dp.device_id = ? LIMIT 1`, { replacements: [data.device_id] }).then(([rows]) => { floorPlan = rows?.[0] || null; }).catch(() => { }));
        }
        // 查询处置记录
        parallelQueries.push(models_1.DispatchRecord.findAll({
            where: { alarm_id: alarm.id },
            order: [['created_at', 'ASC']],
            raw: true,
        }).then((records) => { dispatchRecords = records || []; }).catch(() => { }));
        await Promise.all(parallelQueries);
        if (data.createdAt)
            data.createdAt = fmtDateTime(data.createdAt);
        if (data.updatedAt)
            data.updatedAt = fmtDateTime(data.updatedAt);
        // 格式化 dispatchRecords 时间
        dispatchRecords.forEach((r) => {
            if (r.created_at)
                r.created_at = fmtDateTime(r.created_at);
            if (r.dispatch_time)
                r.dispatch_time = fmtDateTime(r.dispatch_time);
            if (r.verify_time)
                r.verify_time = fmtDateTime(r.verify_time);
            if (r.resolve_time)
                r.resolve_time = fmtDateTime(r.resolve_time);
        });
        // 映射 controlRoom 为前端期望的 camelCase 字段
        // 优先取 fire_control_room，若不存在则回退到 fire_unit 的 contact_name/contact_phone
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
        } : (unit ? {
            roomName: null,
            dutyPerson: unit.contact_name,
            dutyPhone: unit.contact_phone,
            managerName: unit.contact_name,
            managerPhone: unit.contact_phone,
            dutyOfficerName: unit.contact_name,
            dutyOfficerPhone: unit.contact_phone,
            safetyOfficerName: unit.contact_name,
            safetyOfficerPhone: unit.contact_phone,
            videoUrl: null,
        } : null);
        (0, respond_1.sendSuccess)(res, req, {
            ...data,
            unit_id: unitId,
            unit_name: unitName,
            location,
            device_name: deviceName,
            unit,
            controlRoom: mappedControlRoom,
            relatedCameras: cameras,
            floorPlan,
            dispatchRecords,
        });
    },
    async list(req, res) {
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
                    attributes: ['id', 'device_no', 'device_name', 'unit_id', 'install_location'],
                    required: false,
                    include: [{ model: models_1.Unit, as: 'unit', attributes: ['id', 'unit_name'], required: false }],
                },
            ],
        });
        // 补充单位名称、安装位置、设备名称：优先告警记录自身，其次取设备档案关联
        const enriched = rows.map((r) => {
            const data = r.toJSON ? r.toJSON() : r;
            if (!data.unit_name && data.device?.unit?.unit_name) {
                data.unit_name = data.device.unit.unit_name;
            }
            if (!data.unit_id && data.device?.unit_id) {
                data.unit_id = data.device.unit_id;
            }
            // 补充安装位置：优先告警记录自身，其次取设备档案的 install_location
            if ((!data.location || data.location === '') && data.device?.install_location) {
                data.location = data.device.install_location;
            }
            // 补充设备名称：优先告警记录自身，其次取设备档案的 device_name
            if ((!data.device_name || data.device_name === '') && data.device?.device_name) {
                data.device_name = data.device.device_name;
            }
            // 格式化时间为本地可读字符串（同时兼容 created_at / createdAt）
            if (data.createdAt) {
                const formatted = fmtDateTime(data.createdAt);
                data.createdAt = formatted;
                data.created_at = formatted;
            }
            if (data.updatedAt) {
                const formatted = fmtDateTime(data.updatedAt);
                data.updatedAt = formatted;
                data.updated_at = formatted;
            }
            return data;
        });
        (0, respond_1.sendPage)(res, req, enriched, count, +pageNum, +pageSize);
    },
    async stats(req, res) {
        const data = await (0, cache_1.withCache)(cache_1.CacheTags.ALARM_STATS, 'alarm:stats', async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // 统计默认只查最近90天，避免全表扫描（告警表数据量增长快）
            const ninetyDaysAgo = new Date(today);
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const timeWhere = { created_at: { [sequelize_1.Op.gte]: ninetyDaysAgo } };
            const [total, todayCount, pending, byType, byLevel] = await Promise.all([
                models_1.Alarm.count({ where: timeWhere }),
                models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: today } } }),
                models_1.Alarm.count({ where: { status: 0 } }),
                models_1.Alarm.findAll({ attributes: ['alarm_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']], where: timeWhere, group: ['alarm_type'], raw: true }),
                models_1.Alarm.findAll({ attributes: ['alarm_level', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']], where: timeWhere, group: ['alarm_level'], raw: true }),
            ]);
            return { total, today: todayCount, pending, byType, byLevel };
        }, { ttl: 30 });
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async create(req, res) {
        const alarmNo = (0, alarmNo_1.generateAlarmNo)();
        // 安全：仅允许客户端传入白名单字段，防止注入内部字段
        const allowedFields = [
            'alarm_type', 'alarm_level', 'device_id', 'device_name',
            'unit_id', 'unit_name', 'location', 'alarm_desc',
            'longitude', 'latitude', 'snapshot_url', 'video_url'
        ];
        const body = req.body;
        const safeBody = {};
        for (const key of allowedFields) {
            if (key in body)
                safeBody[key] = body[key];
        }
        const alarm = await models_1.Alarm.create({ ...safeBody, alarm_no: alarmNo });
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
        (0, respond_1.sendSuccess)(res, req, { id: alarm.id }, '告警上报成功');
    },
    async confirm(req, res) {
        const { id } = req.params;
        await models_1.Alarm.update({ status: 1, confirm_time: new Date() }, { where: { id } });
        // 同步创建/更新接警处置记录
        const alarm = await models_1.Alarm.findByPk(id, { raw: true });
        if (alarm) {
            const [record] = await models_1.DispatchRecord.findOrCreate({
                where: { alarm_id: alarm.id },
                defaults: {
                    alarm_id: alarm.id,
                    alarm_no: alarm.alarm_no,
                    phase: 'verify',
                    status: 'handling',
                    verify_time: new Date(),
                    handler_id: req.user.userId,
                    handler_name: req.user.username,
                    unit_id: alarm.unit_id,
                    unit_name: alarm.unit_name,
                    device_id: alarm.device_id,
                    device_name: alarm.device_name,
                    location: alarm.location,
                },
            });
            if (!record.isNewRecord) {
                await record.update({ phase: 'verify', status: 'handling', verify_time: new Date(), handler_id: req.user.userId, handler_name: req.user.username });
            }
        }
        (0, respond_1.sendSuccess)(res, req, null, '已确认');
    },
    async handle(req, res) {
        const { id } = req.params;
        const { handleResult } = req.body;
        await models_1.Alarm.update({
            status: 2, handle_time: new Date(),
            handler_id: req.user.userId, handler_name: req.user.username,
            handle_result: handleResult
        }, { where: { id } });
        // 同步创建/更新接警处置记录
        const alarm = await models_1.Alarm.findByPk(id, { raw: true });
        if (alarm) {
            const [record] = await models_1.DispatchRecord.findOrCreate({
                where: { alarm_id: alarm.id },
                defaults: {
                    alarm_id: alarm.id,
                    alarm_no: alarm.alarm_no,
                    phase: 'archive',
                    status: 'resolved',
                    resolve_time: new Date(),
                    handler_id: req.user.userId,
                    handler_name: req.user.username,
                    resolve_note: handleResult,
                    unit_id: alarm.unit_id,
                    unit_name: alarm.unit_name,
                    device_id: alarm.device_id,
                    device_name: alarm.device_name,
                    location: alarm.location,
                },
            });
            if (!record.isNewRecord) {
                await record.update({ phase: 'archive', status: 'resolved', resolve_time: new Date(), handler_id: req.user.userId, handler_name: req.user.username, resolve_note: handleResult });
            }
        }
        (0, respond_1.sendSuccess)(res, req, null, '处理完成');
    },
    async dismiss(req, res) {
        const { id } = req.params;
        await models_1.Alarm.update({ status: 3 }, { where: { id } });
        // 同步创建/更新接警处置记录
        const alarm = await models_1.Alarm.findByPk(id, { raw: true });
        if (alarm) {
            const [record] = await models_1.DispatchRecord.findOrCreate({
                where: { alarm_id: alarm.id },
                defaults: {
                    alarm_id: alarm.id,
                    alarm_no: alarm.alarm_no,
                    phase: 'archive',
                    status: 'confirmed_false',
                    resolve_time: new Date(),
                    handler_id: req.user.userId,
                    handler_name: req.user.username,
                    unit_id: alarm.unit_id,
                    unit_name: alarm.unit_name,
                    device_id: alarm.device_id,
                    device_name: alarm.device_name,
                    location: alarm.location,
                },
            });
            if (!record.isNewRecord) {
                await record.update({ phase: 'archive', status: 'confirmed_false', resolve_time: new Date(), handler_id: req.user.userId, handler_name: req.user.username });
            }
        }
        (0, respond_1.sendSuccess)(res, req, null, '已标记为误报');
    },
    /** 告警消音：联动设备反控消音（需关联 device_id） */
    async silence(req, res) {
        const { id } = req.params;
        const alarm = await models_1.Alarm.findByPk(id);
        if (!alarm)
            throw new httpError_1.HttpError('告警不存在', 404);
        if (!alarm.device_id) {
            (0, respond_1.sendSuccess)(res, req, null, '已记录消音（无关联设备，未下发主机指令）');
            return;
        }
        const result = await deviceControl_service_1.DeviceControlService.silence(+alarm.device_id, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result, result.message);
    },
    async recent(req, res) {
        const alarms = await models_1.Alarm.findAll({ limit: 10, order: [['created_at', 'DESC']] });
        (0, respond_1.sendSuccess)(res, req, alarms);
    },
    async trend(req, res) {
        const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 365);
        const result = await alarm_service_1.AlarmService.getTrend(days);
        // 兼容旧格式：返回简化版 {date, count}
        (0, respond_1.sendSuccess)(res, req, result.map((r) => ({ date: r.date, count: r.fire + r.fault + r.pre })));
    },
};
//# sourceMappingURL=alarm.controller.js.map