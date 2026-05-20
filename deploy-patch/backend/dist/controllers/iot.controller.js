"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IoTController = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const httpError_1 = require("@/utils/httpError");
const logger_1 = __importDefault(require("@/config/logger"));
const redis_1 = __importDefault(require("@/config/redis"));
const models_1 = require("@/models");
const deviceLifecycle_1 = require("@/constants/deviceLifecycle");
const validator_1 = require("@/utils/validator");
/** 路由 :id 支持数字主键或 device_sn（档案设备编码等） */
function resolveIotWhereClause(idParam) {
    const trimmed = String(idParam ?? '').trim();
    if (!trimmed)
        return { id: 0 };
    if (/^\d+$/.test(trimmed)) {
        const n = parseInt(trimmed, 10);
        if (n > 0)
            return { id: n };
    }
    return { device_sn: trimmed };
}
function parseProtocolConfigJson(raw) {
    if (!raw || !String(raw).trim())
        return {};
    try {
        const o = JSON.parse(String(raw));
        return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    }
    catch {
        return { raw };
    }
}
/** 接入页扩展字段写入 protocol_config.accessMeta（表无 floor/imei 等列时） */
function mergeAccessMetaIntoProtocolConfig(body, existingConfig) {
    const base = parseProtocolConfigJson(existingConfig);
    const prevMeta = (base.accessMeta && typeof base.accessMeta === 'object' && !Array.isArray(base.accessMeta))
        ? base.accessMeta
        : {};
    const meta = { ...prevMeta };
    const pick = (camel, snake) => {
        if (body[camel] !== undefined)
            meta[camel] = body[camel];
        if (body[snake] !== undefined)
            meta[snake] = body[snake];
    };
    pick('floor', 'floor');
    pick('room', 'room');
    pick('imei', 'imei');
    pick('heartbeatInterval', 'heartbeat_interval');
    pick('registerCount', 'register_count');
    pick('manufacturer', 'manufacturer');
    pick('model', 'model');
    pick('firmware', 'firmware');
    pick('productionDate', 'production_date');
    pick('installDate', 'install_date');
    pick('warrantyPeriod', 'warranty_period');
    pick('warrantyExpire', 'warranty_expire');
    pick('maintenanceExpire', 'maintenance_expire');
    pick('unitName', 'unit_name');
    // CTWing 海康4G MQTT 接入配置
    pick('productId', 'product_id');
    pick('ctwingDeviceId', 'ctwing_device_id');
    pick('ctwingPassword', 'ctwing_password');
    pick('broker', 'broker');
    pick('keepalive', 'keepalive');
    pick('broker', 'broker');
    pick('keepalive', 'keepalive');
    pick('thresholds', 'thresholds');
    if (body.protocol_config !== undefined && typeof body.protocol_config === 'object' && body.protocol_config !== null) {
        const ext = body.protocol_config;
        Object.assign(base, ext);
    }
    else if (typeof body.protocol_config === 'string' && String(body.protocol_config).trim()) {
        const parsed = parseProtocolConfigJson(String(body.protocol_config));
        Object.assign(base, parsed);
    }
    base.accessMeta = meta;
    return JSON.stringify(base);
}
/** 从请求体提取档案扩展字段（生产日期/安装日期/质保期等） */
function buildArchiveUpdate(body) {
    const archiveUpdate = {};
    if (body.productionDate !== undefined && body.productionDate !== '')
        archiveUpdate.production_date = body.productionDate;
    if (body.installDate !== undefined && body.installDate !== '')
        archiveUpdate.install_date = body.installDate;
    if (body.warrantyPeriod !== undefined && body.warrantyPeriod !== '')
        archiveUpdate.warranty_period = Number(body.warrantyPeriod);
    if (body.warrantyExpire !== undefined && body.warrantyExpire !== '')
        archiveUpdate.warranty_expire = body.warrantyExpire;
    if (body.maintenanceExpire !== undefined && body.maintenanceExpire !== '')
        archiveUpdate.maintenance_expire = body.maintenanceExpire;
    return archiveUpdate;
}
function hasAccessMetaInBody(b) {
    return ['floor', 'room', 'imei', 'heartbeatInterval', 'heartbeat_interval', 'registerCount', 'register_count', 'manufacturer', 'model', 'firmware', 'productionDate', 'production_date', 'installDate', 'install_date', 'warrantyPeriod', 'warranty_period', 'warrantyExpire', 'warranty_expire', 'maintenanceExpire', 'maintenance_expire', 'unitName', 'unit_name', 'productId', 'product_id', 'ctwingDeviceId', 'ctwing_device_id', 'ctwingPassword', 'ctwing_password', 'broker', 'broker', 'keepalive', 'keepalive', 'thresholds'].some((k) => b[k] !== undefined);
}
/** 前端 IoT 设备（camelCase / 旧字段）→ fire_iot_device */
function mapIotDevicePayload(body, idFallback) {
    const b = body || {};
    const sn = String(b.device_sn ?? b.id ?? idFallback).trim() || idFallback;
    const name = String(b.device_name ?? b.name ?? 'IoT设备').trim();
    let status = undefined;
    if (b.status !== undefined && b.status !== null && b.status !== '') {
        const s = String(b.status);
        const sm = { normal: 1, online: 1, fault: 2, offline: 0, disabled: 0, maintenance: 1 };
        if (sm[s] !== undefined)
            status = sm[s];
        else {
            const n = parseInt(s, 10);
            if (Number.isFinite(n))
                status = n;
        }
    }
    const payload = {
        device_sn: sn,
        device_name: name,
        device_type: String(b.device_type ?? b.category ?? '').slice(0, 30) || undefined,
        protocol_type: String(b.protocol_type ?? b.protocol ?? '').slice(0, 20) || undefined,
        ip_address: (b.ip_address ?? b.ip),
        port: b.port !== undefined && b.port !== '' ? Number(b.port) : undefined,
    };
    if (status !== undefined)
        payload.status = status;
    // CTWing 平台设备ID必须写入独立字段（用于推送匹配）
    const ctwingDevId = String(b.ctwingDeviceId ?? b.ctwing_device_id ?? '').trim();
    if (ctwingDevId)
        payload.ctwing_device_id = ctwingDevId;
    if (b.protocol_config !== undefined && typeof b.protocol_config !== 'object') {
        payload.protocol_config = b.protocol_config;
    }
    if (hasAccessMetaInBody(b) || (b.protocol_config !== undefined && typeof b.protocol_config === 'object')) {
        payload.protocol_config = mergeAccessMetaIntoProtocolConfig(b, typeof b.protocol_config === 'string' ? String(b.protocol_config) : undefined);
    }
    return payload;
}
/** 更新：仅写入请求体中出现的字段（避免未传字段被默认值覆盖） */
function mapIotDeviceUpdatePayload(body) {
    const b = body || {};
    const payload = {};
    if (b.device_name !== undefined || b.name !== undefined) {
        payload.device_name = String(b.device_name ?? b.name ?? '').trim();
    }
    if (b.device_type !== undefined || b.category !== undefined) {
        payload.device_type = String(b.device_type ?? b.category ?? '').slice(0, 30) || undefined;
    }
    if (b.protocol_type !== undefined || b.protocol !== undefined) {
        payload.protocol_type = String(b.protocol_type ?? b.protocol ?? '').slice(0, 20) || undefined;
    }
    if (b.ip_address !== undefined || b.ip !== undefined) {
        payload.ip_address = (b.ip_address ?? b.ip);
    }
    if (b.port !== undefined)
        payload.port = b.port !== '' ? Number(b.port) : null;
    if (b.status !== undefined && b.status !== null && b.status !== '') {
        const s = String(b.status);
        const sm = { normal: 1, online: 1, fault: 2, offline: 0, disabled: 0, maintenance: 1 };
        payload.status = sm[s] !== undefined ? sm[s] : parseInt(s, 10);
    }
    // CTWing 平台设备ID更新
    if (b.ctwingDeviceId !== undefined || b.ctwing_device_id !== undefined) {
        const v = String(b.ctwingDeviceId ?? b.ctwing_device_id ?? '').trim();
        payload.ctwing_device_id = v || null;
    }
    if (b.protocol_config !== undefined && typeof b.protocol_config !== 'object') {
        payload.protocol_config = b.protocol_config;
    }
    return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}
exports.IoTController = {
    async deviceList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { keyword, protocolType, status, deviceType, category, unitId } = req.query;
            const where = {};
            if (keyword)
                where[sequelize_1.Op.or] = [{ device_name: { [sequelize_1.Op.like]: `%${keyword}%` } }, { device_sn: { [sequelize_1.Op.like]: `%${keyword}%` } }];
            if (protocolType)
                where.protocol_type = protocolType;
            if (status !== undefined && status !== '')
                where.status = status;
            const dt = deviceType || category;
            if (dt)
                where.device_type = String(dt);
            if (unitId !== undefined && unitId !== '')
                where.unit_id = unitId;
            /* 数据一致性过滤：排除无档案关联的孤儿记录（海康4G自动注册已同步建档） */
            const whereSafe = {
                [sequelize_1.Op.and]: [
                    where,
                    { archive_device_id: { [sequelize_1.Op.not]: null } },
                ],
            };
            const { count, rows } = await models_1.IoTDevice.findAndCountAll({
                where: whereSafe,
                limit: pageSize,
                offset: (pageNum - 1) * pageSize,
                include: [
                    { model: models_1.Device, as: 'archiveDevice', attributes: ['id', 'device_no', 'device_name', 'manufacturer', 'production_date', 'warranty_period', 'warranty_expire', 'install_date', 'maintenance_expire', 'unit_id'] },
                    { model: models_1.Unit, as: 'unit', attributes: ['id', 'unit_name'] },
                ],
                order: [['id', 'DESC']],
            });
            (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
        }
        catch (err) {
            logger_1.default.error(`[IoTController] deviceList 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async deviceCreate(req, res) {
        const body = (req.body || {});
        const archiveRaw = body.archive_device_id ?? body.archiveDeviceId ?? body.deviceId ?? body.archiveId;
        const archiveId = archiveRaw != null && String(archiveRaw).trim() !== '' ? parseInt(String(archiveRaw), 10) : NaN;
        if (!Number.isFinite(archiveId) || archiveId <= 0) {
            return res
                .status(400)
                .json((0, response_1.fail)('须先在「设备档案」完成入库，并传入档案设备ID（archive_device_id / archiveDeviceId）', 400));
        }
        const devRow = await models_1.Device.findByPk(archiveId);
        if (!devRow)
            throw new httpError_1.HttpError('档案中不存在该设备', 404, 404);
        const dev = devRow;
        if (!deviceLifecycle_1.DeviceLifecycleRules.canConnect(dev.lifecycle_status)) {
            const msg = dev.lifecycle_status === deviceLifecycle_1.DeviceLifecycleStatus.SCRAPPED
                ? '设备已报废，不可接入'
                : deviceLifecycle_1.DeviceLifecycleRules.messages.connect;
            throw new httpError_1.HttpError(msg, 400, 400);
        }
        const archiveSn = String(dev.device_sn || dev.device_no || '').trim();
        if (!archiveSn)
            throw new httpError_1.HttpError('档案缺少设备SN/编号，请先完善档案', 400, 400);
        /* CTWing/第三方平台接入时，device_sn 可用平台设备ID（可能与档案SN不同）
           但创建时若显传 device_sn，优先使用传入值；否则回退到档案SN */
        const incomingSn = String(body.device_sn ?? body.deviceSn ?? '').trim();
        const finalSn = incomingSn || archiveSn;
        if (incomingSn && incomingSn !== archiveSn && incomingSn !== dev.device_no) {
            logger_1.default.info(`[IoTController] 接入SN与档案SN不一致: incoming=${incomingSn}, archive=${archiveSn}, archiveId=${archiveId}`);
        }
        const t = await database_1.default.transaction();
        try {
            const payload = mapIotDevicePayload(body, finalSn);
            payload.device_sn = finalSn;
            payload.device_name = dev.device_name;
            payload.device_type = dev.device_type || payload.device_type;
            payload.archive_device_id = archiveId;
            payload.unit_id = (dev.unit_id && Number(dev.unit_id) > 0) ? dev.unit_id : null;
            const existing = await models_1.IoTDevice.findOne({ where: { archive_device_id: archiveId }, transaction: t });
            let row;
            if (existing) {
                await existing.update(payload, { transaction: t });
                row = existing;
            }
            else {
                row = await models_1.IoTDevice.create(payload, { transaction: t });
            }
            const nextLife = Math.max(Number(dev.lifecycle_status) || deviceLifecycle_1.DeviceLifecycleStatus.REGISTERED, deviceLifecycle_1.DeviceLifecycleStatus.PLATFORM_CONNECTED);
            await devRow.update({ lifecycle_status: nextLife }, { transaction: t });
            // 同步档案扩展字段（生产日期、质保期、维保到期日等）
            const archiveUpdate = buildArchiveUpdate(body);
            if (Object.keys(archiveUpdate).length > 0) {
                await devRow.update(archiveUpdate, { transaction: t });
            }
            await t.commit();
            (0, respond_1.sendSuccess)(res, req, {
                id: String(row.id),
                archive_device_id: String(archiveId),
                device_sn: row.device_sn,
                device_name: row.device_name,
                protocol_type: row.protocol_type,
                device_type: row.device_type,
            }, existing ? '接入配置已更新' : '接入成功');
        }
        catch (err) {
            await t.rollback().catch(() => { });
            logger_1.default.error(`[IoTController] deviceCreate 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async deviceUpdate(req, res) {
        try {
            const whereClause = resolveIotWhereClause(req.params.id);
            let payload = mapIotDeviceUpdatePayload((req.body || {}));
            const body = (req.body || {});
            if (hasAccessMetaInBody(body) || (body.protocol_config !== undefined && typeof body.protocol_config === 'object')) {
                const row = await models_1.IoTDevice.findOne({ where: whereClause });
                if (!row)
                    throw new httpError_1.HttpError('设备不存在', 404, 404);
                payload.protocol_config = mergeAccessMetaIntoProtocolConfig(body, row.protocol_config);
            }
            // 先查询获取 archive_id，避免 update 后再 findOne 的 N+1 问题
            const preRow = await models_1.IoTDevice.findOne({ where: whereClause, raw: true });
            if (!preRow)
                throw new httpError_1.HttpError('设备不存在', 404, 404);
            const archiveId = preRow ? preRow.archive_device_id : null;
            if (Object.keys(payload).length === 0) {
                (0, respond_1.sendSuccess)(res, req, null, '暂无更新内容');
                return;
            }
            const [n] = await models_1.IoTDevice.update(payload, { where: whereClause });
            if (!n)
                throw new httpError_1.HttpError('设备不存在', 404, 404);
            // 同步档案扩展字段
            if (archiveId) {
                const archiveUpdate = buildArchiveUpdate(body);
                if (Object.keys(archiveUpdate).length > 0) {
                    await models_1.Device.update(archiveUpdate, { where: { id: archiveId } });
                }
            }
            (0, respond_1.sendSuccess)(res, req, null, '更新成功');
        }
        catch (err) {
            logger_1.default.error(`[IoTController] deviceUpdate 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async deviceDelete(req, res) {
        try {
            const whereClause = resolveIotWhereClause(req.params.id);
            const row = await models_1.IoTDevice.findOne({ where: whereClause });
            if (!row)
                throw new httpError_1.HttpError('设备不存在', 404, 404);
            const r = row;
            const archiveId = r.archive_device_id;
            await row.destroy();
            if (archiveId) {
                const dev = await models_1.Device.findByPk(archiveId);
                if (dev) {
                    const d = dev;
                    if (d.lifecycle_status !== deviceLifecycle_1.DeviceLifecycleStatus.SCRAPPED) {
                        const hasUnit = d.unit_id != null && Number(d.unit_id) > 0;
                        await dev.update({
                            lifecycle_status: hasUnit
                                ? deviceLifecycle_1.DeviceLifecycleStatus.ASSIGNED
                                : deviceLifecycle_1.DeviceLifecycleStatus.REGISTERED,
                        });
                    }
                }
            }
            (0, respond_1.sendSuccess)(res, req, null, '已移除接入');
        }
        catch (err) {
            logger_1.default.error(`[IoTController] deviceDelete 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async protocolList(req, res) {
        try {
            const list = await models_1.ProtocolConfig.findAll({ limit: 1000 });
            (0, respond_1.sendSuccess)(res, req, list);
        }
        catch (err) {
            logger_1.default.error(`[IoTController] protocolList 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async protocolCreate(req, res) {
        try {
            const p = await models_1.ProtocolConfig.create(req.body);
            (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
        }
        catch (err) {
            logger_1.default.error(`[IoTController] protocolCreate 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async protocolUpdate(req, res) {
        try {
            await models_1.ProtocolConfig.update(req.body, { where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '更新成功');
        }
        catch (err) {
            logger_1.default.error(`[IoTController] protocolUpdate 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async protocolDelete(req, res) {
        try {
            await models_1.ProtocolConfig.destroy({ where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '删除成功');
        }
        catch (err) {
            logger_1.default.error(`[IoTController] protocolDelete 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async pipelineList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { count, rows: list } = await models_1.DataPipeline.findAndCountAll({
                limit: +pageSize,
                offset: (+pageNum - 1) * +pageSize,
                order: [['created_at', 'DESC']],
            });
            // ── 从 Redis 获取真实吞吐统计（替代 random）──
            const globalStats = await redis_1.default.hgetall('iot:stats:global');
            const rawPackets = parseInt(globalStats.rawPackets || '0', 10);
            const parsed = parseInt(globalStats.parsed || '0', 10);
            const dropped = parseInt(globalStats.dropped || '0', 10);
            // 并行获取所有管道的 Redis 统计，消除 N+1
            const pipeStatsList = await Promise.all(list.map(p => redis_1.default.hgetall(`iot:stats:pipeline:${p.id}`)));
            // 按管道类型聚合统计
            const kafkaTopics = [];
            const influxMetrics = [];
            const pgTables = [];
            list.forEach((p, idx) => {
                const pipeStats = pipeStatsList[idx];
                const msgCount = parseInt(pipeStats.msgCount || '0', 10);
                const lastMsgTime = parseInt(pipeStats.lastMsgTime || '0', 10);
                const destType = String(p.dest_type || '').toLowerCase();
                const sourceType = String(p.source_type || '').toLowerCase();
                const cfg = typeof p.dest_config === 'string' && p.dest_config.trim()
                    ? JSON.parse(p.dest_config)
                    : (p.dest_config || {});
                if (destType.includes('kafka') || sourceType.includes('kafka')) {
                    const elapsedSec = Math.max(1, Math.floor((Date.now() - (lastMsgTime || Date.now())) / 1000) + 1);
                    kafkaTopics.push({
                        name: p.pipeline_name || '未命名',
                        partitions: cfg.partitions || 1,
                        messagesPerSec: Math.round(msgCount / elapsedSec),
                        lag: 0,
                        consumers: cfg.consumers || 1,
                        status: p.status === 1 ? 'healthy' : 'warning',
                    });
                }
                else if (destType.includes('influx') || sourceType.includes('influx')) {
                    influxMetrics.push({
                        measurement: p.pipeline_name || '未命名',
                        points: msgCount * 10,
                        retention: cfg.retention || '30d',
                        lastWrite: lastMsgTime ? new Date(lastMsgTime).toISOString() : new Date().toISOString(),
                        writeRate: msgCount > 0 ? Math.round(msgCount / 60) : 0,
                    });
                }
                else if (destType.includes('pg') || destType.includes('postgre') || sourceType.includes('pg')) {
                    pgTables.push({
                        table: p.pipeline_name || '未命名',
                        desc: p.description || `${sourceType} → ${destType}`,
                        records: msgCount,
                        lastSync: lastMsgTime ? new Date(lastMsgTime).toLocaleString('zh-CN') : '--',
                    });
                }
            });
            // 联动模块统计（占位：接入真实联动表后替换）
            const linkageModules = [];
            const stats = {
                rawPackets,
                parsed,
                dropped,
                kafkaPublished: kafkaTopics.reduce((s, t) => s + t.messagesPerSec, 0),
                influxWritten: influxMetrics.reduce((s, m) => s + (m.points || 0), 0),
                pgUpdated: pgTables.reduce((s, t) => s + (t.records || 0), 0),
                avgLatency: '< 50ms',
                throughput: rawPackets > 0 ? `${Math.round(rawPackets / 60)}/s` : '0/s',
            };
            (0, respond_1.sendSuccess)(res, req, {
                list,
                total: count,
                page: +pageNum,
                pageSize: +pageSize,
                totalPages: Math.ceil(count / +pageSize),
                stats,
                kafkaTopics,
                influxMetrics,
                pgTables,
                linkageModules,
            });
        }
        catch (err) {
            logger_1.default.error(`[IoTController] pipelineList 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async pipelineCreate(req, res) {
        try {
            const p = await models_1.DataPipeline.create(req.body);
            (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
        }
        catch (err) {
            logger_1.default.error(`[IoTController] pipelineCreate 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async pipelineUpdate(req, res) {
        try {
            await models_1.DataPipeline.update(req.body, { where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '更新成功');
        }
        catch (err) {
            logger_1.default.error(`[IoTController] pipelineUpdate 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
};
//# sourceMappingURL=iot.controller.js.map