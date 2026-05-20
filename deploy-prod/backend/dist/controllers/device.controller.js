"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceController = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
const respond_1 = require("@/utils/respond");
const httpError_1 = require("@/utils/httpError");
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const deviceLifecycle_1 = require("@/constants/deviceLifecycle");
const validator_1 = require("@/utils/validator");
const cache_1 = require("@/utils/cache");
/* ─────────────────────────────────────────────────────────────────
   设备字段映射：前端 camelCase → 后端 snake_case（fire_device 表）
   兼容多层前端调用（旧版/新版/App）
   ───────────────────────────────────────────────────────────────── */
/** 生成唯一设备编号：EQ-yyyyMMdd-xxx */
function generateDeviceNo(seq = 1) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `EQ-${dateStr}-${String(seq).padStart(3, '0')}`;
}
/** 核心字段映射与校验 */
function mapLegacyDeviceBody(body, isCreate = false) {
    const b = body || {};
    const payload = {};
    const errors = [];
    // ── 必填校验 ──
    const name = (b.device_name ?? b.name);
    if (!name || !String(name).trim()) {
        errors.push('设备名称不能为空');
    }
    else {
        payload.device_name = String(name).trim();
    }
    const type = (b.device_type ?? b.type);
    if (!type || !String(type).trim()) {
        errors.push('设备类型不能为空');
    }
    else {
        payload.device_type = String(type).trim();
    }
    // device_no：创建时自动生成，更新时不强制（若传则校验唯一性由库处理）
    if (isCreate) {
        const explicitNo = (b.device_no ?? b.deviceNo ?? b.serialNo);
        payload.device_no = explicitNo && String(explicitNo).trim()
            ? String(explicitNo).trim()
            : generateDeviceNo(Math.floor(Math.random() * 900) + 100);
    }
    else if (b.device_no !== undefined || b.deviceNo !== undefined) {
        const v = (b.device_no ?? b.deviceNo);
        if (v && String(v).trim())
            payload.device_no = String(v).trim();
    }
    // ── 可选字段映射 ──
    if (b.device_model !== undefined || b.model !== undefined) {
        const v = (b.device_model ?? b.model);
        payload.device_model = v != null ? String(v) : undefined;
    }
    if (b.manufacturer !== undefined) {
        payload.manufacturer = String(b.manufacturer || '');
    }
    if (b.unit_id !== undefined || b.unitId !== undefined) {
        const v = b.unit_id ?? b.unitId;
        if (v !== '' && v !== null && v !== undefined) {
            payload.unit_id = Number(v);
        }
        else if (v === null) {
            payload.unit_id = null;
        }
        /* v === '' 时不设置 unit_id，避免前端未传该字段时被误判为解绑 */
    }
    if (b.install_location !== undefined || b.location !== undefined) {
        payload.install_location = String((b.install_location ?? b.location) || '');
    }
    if (b.floor !== undefined)
        payload.floor = String(b.floor || '');
    if (b.room !== undefined)
        payload.room = String(b.room || '');
    if (b.lng !== undefined && b.lng !== '' && b.lng !== null) {
        const n = Number(b.lng);
        if (Number.isFinite(n))
            payload.lng = n;
    }
    if (b.lat !== undefined && b.lat !== '' && b.lat !== null) {
        const n = Number(b.lat);
        if (Number.isFinite(n))
            payload.lat = n;
    }
    if (b.install_date !== undefined || b.installDate !== undefined) {
        const v = b.install_date ?? b.installDate;
        payload.install_date = v && String(v).trim() ? String(v) : undefined;
    }
    if (b.production_date !== undefined || b.productionDate !== undefined) {
        const v = b.production_date ?? b.productionDate;
        payload.production_date = v && String(v).trim() ? String(v) : undefined;
    }
    if (b.warranty_period !== undefined || b.warrantyPeriod !== undefined) {
        const v = Number(b.warranty_period ?? b.warrantyPeriod);
        if (Number.isFinite(v) && v >= 0)
            payload.warranty_period = v;
    }
    if (b.warranty_expire !== undefined || b.warrantyExpire !== undefined) {
        const v = b.warranty_expire ?? b.warrantyExpire;
        payload.warranty_expire = v && String(v).trim() ? String(v) : undefined;
    }
    if (b.maintenance_expire !== undefined || b.maintenanceExpire !== undefined) {
        const v = b.maintenance_expire ?? b.maintenanceExpire;
        payload.maintenance_expire = v && String(v).trim() ? String(v) : undefined;
    }
    if (b.status !== undefined && b.status !== null && String(b.status).trim() !== '') {
        const sn = parseInt(String(b.status), 10);
        if (Number.isFinite(sn))
            payload.status = sn;
    }
    if (b.lifecycle_status !== undefined || b.lifecycleStatus !== undefined) {
        const v = Number(b.lifecycle_status ?? b.lifecycleStatus);
        if (Number.isFinite(v))
            payload.lifecycle_status = v;
    }
    else if (isCreate) {
        payload.lifecycle_status = 1;
    }
    if (b.iot_id !== undefined || b.ip !== undefined) {
        payload.iot_id = String((b.iot_id ?? b.ip) || '');
    }
    if (b.protocol_type !== undefined || b.protocolType !== undefined) {
        payload.protocol_type = String((b.protocol_type ?? b.protocolType) || '');
    }
    if (b.device_sn !== undefined || b.serialNo !== undefined) {
        payload.device_sn = String((b.device_sn ?? b.serialNo) || '');
    }
    if (b.protocol_config !== undefined) {
        payload.protocol_config = typeof b.protocol_config === 'string'
            ? b.protocol_config
            : JSON.stringify(b.protocol_config);
    }
    if (b.project_code !== undefined)
        payload.project_code = String(b.project_code || '');
    if (b.building_id !== undefined || b.buildingId !== undefined) {
        const v = b.building_id ?? b.buildingId;
        if (v !== '' && v !== null && v !== undefined)
            payload.building_id = Number(v);
    }
    if (b.floor_id !== undefined || b.floorId !== undefined) {
        const v = b.floor_id ?? b.floorId;
        if (v !== '' && v !== null && v !== undefined)
            payload.floor_id = Number(v);
    }
    if (b.point_id !== undefined || b.pointId !== undefined) {
        const v = b.point_id ?? b.pointId;
        if (v !== '' && v !== null && v !== undefined)
            payload.point_id = Number(v);
    }
    // gateway_id：关联网关/传输装置ID（赋安FSCN8001等场景，主机档案关联传输装置）
    if (b.gateway_id !== undefined || b.gatewayId !== undefined) {
        const v = b.gateway_id ?? b.gatewayId;
        if (v !== '' && v !== null && v !== undefined)
            payload.gateway_id = String(v);
        else if (v === null)
            payload.gateway_id = null;
    }
    // 前端额外字段：映射到扩展 JSON 字段 config 中
    const extraFields = ['remark', 'calibrationCycle', 'calibration_cycle', 'scrapYear', 'scrap_year'];
    const configExtra = {};
    for (const key of extraFields) {
        if (b[key] !== undefined && b[key] !== '' && b[key] !== null) {
            configExtra[key] = b[key];
        }
    }
    if (Object.keys(configExtra).length > 0) {
        payload.config = JSON.stringify(configExtra);
    }
    return { payload, errors: errors.length > 0 ? errors : undefined };
}
exports.DeviceController = {
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { keyword, deviceType, unitId, status, lifecycleStatus, lifecycle_status, minLifecycleStatus, min_lifecycle_status, hasIotConfig, has_iot_config, } = req.query;
        const where = {};
        if (keyword) {
            where[sequelize_1.Op.or] = [
                { device_name: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { device_no: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { device_sn: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { gateway_id: { [sequelize_1.Op.like]: `%${keyword}%` } },
            ];
        }
        if (deviceType)
            where.device_type = deviceType;
        if (unitId)
            where.unit_id = unitId;
        if (status !== undefined)
            where.status = status;
        const ls = lifecycleStatus ?? lifecycle_status;
        if (ls !== undefined && ls !== '') {
            const lsStr = String(ls);
            if (lsStr.includes(',')) {
                where.lifecycle_status = { [sequelize_1.Op.in]: lsStr.split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite) };
            }
            else {
                const n = parseInt(lsStr, 10);
                if (Number.isFinite(n))
                    where.lifecycle_status = n;
            }
        }
        else {
            const minLs = minLifecycleStatus ?? min_lifecycle_status;
            if (minLs !== undefined && minLs !== '') {
                const n = parseInt(String(minLs), 10);
                if (Number.isFinite(n))
                    where.lifecycle_status = { [sequelize_1.Op.gte]: n };
            }
        }
        /* 设备配置页面仅返回有IoT接入配置的设备：使用 EXISTS 子查询，避免全表扫描和内存过滤 */
        const needIot = hasIotConfig ?? has_iot_config;
        if (needIot === 'true' || needIot === '1') {
            where[sequelize_1.Op.and] = [
                where[sequelize_1.Op.and],
                sequelize_1.Sequelize.literal(`EXISTS (SELECT 1 FROM fire_iot_device iot WHERE iot.archive_device_id = fire_device.id AND iot.archive_device_id IS NOT NULL LIMIT 1)`)
            ];
        }
        const { count, rows } = await models_1.Device.findAndCountAll({
            where,
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
            include: [{ model: models_1.Unit, as: 'unit', attributes: ['id', 'unit_name'] }],
            order: [['created_at', 'DESC']],
        });
        /* 显式序列化，确保关联 unit 数据被正确提取到顶层，防止 Sequelize toJSON 差异导致前端取不到 unit_name */
        const deviceIds = rows.map((r) => r.id);
        /* 批量查询 fire_iot_device 的在线状态和接入情况 */
        let iotMap = {};
        if (deviceIds.length > 0) {
            const iotRows = await models_1.IoTDevice.findAll({
                attributes: ['archive_device_id', 'status', 'last_online'],
                where: { archive_device_id: { [sequelize_1.Op.in]: deviceIds } },
                raw: true,
            });
            iotMap = iotRows.reduce((acc, row) => {
                const isOnline = row.status === 1 || (row.last_online && new Date(row.last_online).getTime() > Date.now() - 10 * 60 * 1000);
                acc[row.archive_device_id] = { online_status: isOnline ? 'online' : 'offline', has_iot: true };
                return acc;
            }, {});
        }
        const list = rows.map((r) => {
            const json = r.toJSON ? r.toJSON() : r;
            const unit = json.unit;
            const iotInfo = iotMap[json.id];
            return {
                ...json,
                unit_name: unit?.unit_name ?? json.unit_name ?? '',
                unit_id: json.unit_id ?? null,
                online_status: iotInfo?.online_status ?? json.online_status ?? 'offline',
                has_iot_config: !!iotInfo?.has_iot,
            };
        });
        (0, respond_1.sendPage)(res, req, list, count, +pageNum, +pageSize);
    },
    async create(req, res) {
        const { payload, errors } = mapLegacyDeviceBody((req.body || {}), true);
        if (errors && errors.length > 0) {
            throw new httpError_1.HttpError(errors.join('；'), 400);
        }
        // 使用数据库唯一约束捕获 + 重试，避免高并发时 device_no 重复
        let device = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0 || !payload.device_no) {
                payload.device_no = generateDeviceNo(Math.floor(Math.random() * 900) + 100);
            }
            try {
                device = await models_1.Device.create(payload);
                break;
            }
            catch (e) {
                if (e?.name === 'SequelizeUniqueConstraintError' && attempt < 2)
                    continue;
                throw e;
            }
        }
        logger_1.default.info(`[Device] 创建成功 id=${device.id} device_no=${payload.device_no}`);
        (0, respond_1.sendSuccess)(res, req, { id: device.id }, '创建成功');
    },
    async update(req, res) {
        const { payload, errors } = mapLegacyDeviceBody((req.body || {}), false);
        if (errors && errors.length > 0) {
            throw new httpError_1.HttpError(errors.join('；'), 400);
        }
        if (Object.keys(payload).length === 0) {
            (0, respond_1.sendSuccess)(res, req, null, '暂无更新内容');
            return;
        }
        await models_1.Device.update(payload, { where: { id: req.params.id } });
        logger_1.default.info(`[Device] 更新成功 id=${req.params.id}`);
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async delete(req, res) {
        const t = await database_1.default.transaction();
        try {
            const id = parseInt(String(req.params.id), 10);
            if (!Number.isFinite(id) || id <= 0) {
                await t.rollback();
                throw new httpError_1.HttpError('无效的设备ID', 400);
            }
            /* 先移除接入层，避免留下 archive_device_id 指向已删档案的孤儿或悬空引用 */
            await models_1.IoTDevice.destroy({ where: { archive_device_id: id }, transaction: t });
            await models_1.Device.destroy({ where: { id }, transaction: t });
            await t.commit();
            logger_1.default.info(`[Device] 删除成功 id=${id}`);
            (0, respond_1.sendSuccess)(res, req, null, '删除成功');
        }
        catch (err) {
            await t.rollback();
            throw err;
        }
    },
    async stats(req, res) {
        const data = await (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, 'device:overview', async () => {
            const total = await models_1.Device.count();
            const online = await models_1.Device.count({ where: { status: 1 } });
            const offline = await models_1.Device.count({ where: { status: 3 } });
            const fault = await models_1.Device.count({ where: { status: 2 } });
            return {
                total,
                online,
                offline,
                fault,
                onlineRate: total ? ((online / total) * 100).toFixed(1) : 0,
            };
        }, { ttl: 60 });
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async types(req, res) {
        const types = await (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, 'device:types', async () => {
            return models_1.Device.findAll({
                attributes: ['device_type', [models_1.Device.sequelize.fn('COUNT', '*'), 'count']],
                where: { lifecycle_status: { [sequelize_1.Op.ne]: deviceLifecycle_1.DeviceLifecycleStatus.SCRAPPED } },
                group: ['device_type'], raw: true,
            });
        }, { ttl: 60 });
        (0, respond_1.sendSuccess)(res, req, types);
    },
    async scrap(req, res) {
        await models_1.Device.update({ status: 4, lifecycle_status: 5 }, { where: { id: req.params.id } });
        logger_1.default.info(`[Device] 报废成功 id=${req.params.id}`);
        (0, respond_1.sendSuccess)(res, req, null, '报废成功');
    },
    async getConfig(req, res) {
        const device = await models_1.Device.findByPk(req.params.id);
        let config = {};
        try {
            config = device?.config ? JSON.parse(device.config) : {};
        }
        catch {
            config = {};
        }
        (0, respond_1.sendSuccess)(res, req, config);
    },
    async saveConfig(req, res) {
        const configJson = JSON.stringify(req.body || {});
        await models_1.Device.update({ config: configJson }, { where: { id: req.params.id } });
        logger_1.default.info(`[Device] 配置保存成功 id=${req.params.id}`);
        (0, respond_1.sendSuccess)(res, req, null, '配置保存成功');
    },
};
//# sourceMappingURL=device.controller.js.map