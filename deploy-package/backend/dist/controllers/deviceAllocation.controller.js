"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceAllocationController = void 0;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const httpError_1 = require("@/utils/httpError");
const validator_1 = require("@/utils/validator");
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const deviceLifecycle_1 = require("@/constants/deviceLifecycle");
const database_1 = __importDefault(require("@/config/database"));
function parseIds(body) {
    const raw = body.deviceIds || body.device_ids;
    if (!Array.isArray(raw))
        return [];
    return raw.map((x) => String(x).trim()).filter(Boolean);
}
/** 写入分配日志（事务外异步，失败不影响主流程） */
async function logAllocation(params) {
    try {
        await database_1.default.query(`INSERT INTO fire_device_allocation_log
        (device_id, device_no, device_name, operation_type,
         prev_unit_id, prev_unit_name, new_unit_id, new_unit_name,
         project_code, building_id, floor_id, point_id,
         operator_id, operator_name, remark, created_at)
       VALUES
        (:device_id, :device_no, :device_name, :operation_type,
         :prev_unit_id, :prev_unit_name, :new_unit_id, :new_unit_name,
         :project_code, :building_id, :floor_id, :point_id,
         :operator_id, :operator_name, :remark, NOW())`, { replacements: params });
    }
    catch (e) {
        console.warn('[AllocationLog] write failed', e);
    }
}
exports.DeviceAllocationController = {
    /** 待分配列表：已接入平台且尚未绑定单位 */
    async listPending(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { keyword } = req.query;
            const where = {
                lifecycle_status: deviceLifecycle_1.DeviceLifecycleStatus.PLATFORM_CONNECTED,
            };
            if (keyword) {
                where[sequelize_1.Op.and] = [
                    {
                        [sequelize_1.Op.or]: [
                            { unit_id: { [sequelize_1.Op.is]: null } },
                            { unit_id: { [sequelize_1.Op.eq]: 0 } },
                        ],
                    },
                    {
                        [sequelize_1.Op.or]: [
                            { device_name: { [sequelize_1.Op.like]: `%${keyword}%` } },
                            { device_no: { [sequelize_1.Op.like]: `%${keyword}%` } },
                            { device_sn: { [sequelize_1.Op.like]: `%${keyword}%` } },
                        ],
                    },
                ];
            }
            else {
                where[sequelize_1.Op.or] = [
                    { unit_id: { [sequelize_1.Op.is]: null } },
                    { unit_id: { [sequelize_1.Op.eq]: 0 } },
                ];
            }
            const { count, rows } = await models_1.Device.findAndCountAll({
                where,
                limit: pageSize,
                offset: (pageNum - 1) * pageSize,
                order: [['created_at', 'DESC']],
            });
            const list = rows.map((r) => {
                const d = r;
                return {
                    id: String(d.id),
                    code: d.device_no,
                    name: d.device_name,
                    category: d.device_type,
                    manufacturer: d.manufacturer || '',
                    model: d.device_model || '',
                    protocol_type: d.protocol_type || '',
                    device_sn: d.device_sn || '',
                    lifecycle_status: d.lifecycle_status,
                };
            });
            (0, respond_1.sendPage)(res, req, list, count, pageNum, pageSize);
        }
        catch (err) {
            logger_1.default.error(`[DeviceAllocation] listPending 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async allocate(req, res) {
        try {
            const body = (req.body || {});
            const deviceIds = parseIds(body);
            const unitRaw = body.unit_id || body.unitId || body.newUnitId;
            const unitId = unitRaw != null && String(unitRaw).trim() !== '' ? parseInt(String(unitRaw), 10) : NaN;
            if (deviceIds.length === 0)
                throw new httpError_1.HttpError('请选择设备', 400, 400);
            if (!Number.isFinite(unitId) || unitId <= 0)
                throw new httpError_1.HttpError('请选择有效单位', 400, 400);
            const unit = await models_1.Unit.findByPk(unitId);
            if (!unit)
                throw new httpError_1.HttpError('单位不存在', 404, 404);
            const unitName = unit.unit_name || '';
            const projectCode = body.project_code != null ? String(body.project_code).slice(0, 64) : null;
            const buildingId = body.building_id != null && body.building_id !== '' ? Number(body.building_id) : null;
            const floorId = body.floor_id != null && body.floor_id !== '' ? Number(body.floor_id) : null;
            const pointId = body.point_id != null && body.point_id !== '' ? Number(body.point_id) : null;
            const operatorId = body.operator_id != null && body.operator_id !== '' ? Number(body.operator_id) : null;
            const operatorName = body.operator_name != null ? String(body.operator_name) : null;
            const remark = body.remark != null ? String(body.remark).slice(0, 500) : null;
            // 批量查询：避免 N+1
            const numericIds = deviceIds.map(id => parseInt(String(id), 10)).filter(n => Number.isFinite(n) && n > 0);
            if (numericIds.length === 0)
                throw new httpError_1.HttpError('没有可分配的设备', 400, 400);
            const devices = await models_1.Device.findAll({ where: { id: { [sequelize_1.Op.in]: numericIds } } });
            if (devices.length === 0)
                throw new httpError_1.HttpError('没有可分配的设备', 400, 400);
            // 预校验所有设备状态
            for (const dev of devices) {
                const d = dev;
                if (d.lifecycle_status === deviceLifecycle_1.DeviceLifecycleStatus.SCRAPPED) {
                    throw new httpError_1.HttpError(`设备 ${d.device_no} 已报废，不可分配`, 400, 400);
                }
                if (!deviceLifecycle_1.DeviceLifecycleRules.canAllocate(d.lifecycle_status)) {
                    return res.status(400).json((0, response_1.fail)(`设备 ${d.device_no} ${deviceLifecycle_1.DeviceLifecycleRules.messages.allocate}，当前状态：${d.lifecycle_status}`, 400));
                }
                if (d.unit_id != null && Number(d.unit_id) > 0) {
                    throw new httpError_1.HttpError(`设备 ${d.device_no} 已绑定单位，请先解绑或使用改派`, 400, 400);
                }
            }
            // 统一事务：全部成功或全部回滚
            const t = await database_1.default.transaction();
            let allocatedCount = 0;
            try {
                for (const dev of devices) {
                    const d = dev;
                    await dev.update({
                        unit_id: unitId,
                        lifecycle_status: deviceLifecycle_1.DeviceLifecycleStatus.ASSIGNED,
                        project_code: projectCode,
                        building_id: buildingId,
                        floor_id: floorId,
                        point_id: pointId,
                    }, { transaction: t });
                    await models_1.IoTDevice.update({ unit_id: unitId }, { where: { archive_device_id: d.id }, transaction: t });
                    /* 同步更新维保记录中的单位名称 */
                    await database_1.default.query(`UPDATE fire_device_maintenance SET unit_name = :unitName WHERE device_id = :deviceId`, { replacements: { unitName, deviceId: d.id }, transaction: t });
                    allocatedCount += 1;
                }
                await t.commit();
                // 事务提交成功后异步写日志（不影响响应）
                for (const dev of devices) {
                    const d = dev;
                    logAllocation({
                        device_id: Number(d.id),
                        device_no: d.device_no || '',
                        device_name: d.device_name || '',
                        operation_type: 1,
                        prev_unit_id: null,
                        prev_unit_name: null,
                        new_unit_id: unitId,
                        new_unit_name: unitName,
                        project_code: projectCode,
                        building_id: buildingId,
                        floor_id: floorId,
                        point_id: pointId,
                        operator_id: operatorId,
                        operator_name: operatorName,
                        remark,
                    }).catch(() => { });
                }
                (0, respond_1.sendSuccess)(res, req, { allocatedCount }, '分配成功');
            }
            catch (innerErr) {
                await t.rollback().catch(() => { });
                logger_1.default.error(`[DeviceAllocation] 批量分配失败: ${innerErr?.message || innerErr}`);
                throw new httpError_1.HttpError(`分配失败: ${innerErr?.message || '未知错误'}，已自动回滚，无数据变更`, 500);
            }
        }
        catch (err) {
            logger_1.default.error(`[DeviceAllocation] allocate 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async unallocate(req, res) {
        try {
            const deviceIds = parseIds((req.body || {}));
            if (deviceIds.length === 0)
                throw new httpError_1.HttpError('请选择设备', 400, 400);
            const operatorId = (req.body || {}).operator_id != null && (req.body || {}).operator_id !== '' ? Number((req.body || {}).operator_id) : null;
            const operatorName = (req.body || {}).operator_name != null ? String((req.body || {}).operator_name) : null;
            const remark = (req.body || {}).remark != null ? String((req.body || {}).remark).slice(0, 500) : null;
            // 批量查询：避免 N+1
            const numericIds = deviceIds.map(id => parseInt(String(id), 10)).filter(n => Number.isFinite(n) && n > 0);
            const devices = await models_1.Device.findAll({ where: { id: { [sequelize_1.Op.in]: numericIds } } });
            // 批量查询单位名称
            const unitIds = [...new Set(devices.map(d => d.unit_id).filter(Boolean))];
            const units = unitIds.length > 0
                ? await models_1.Unit.findAll({ where: { id: { [sequelize_1.Op.in]: unitIds } }, attributes: ['id', 'unit_name'] })
                : [];
            const unitMap = new Map(units.map(u => [String(u.id), u.unit_name || '']));
            let n = 0;
            for (const dev of devices) {
                const d = dev;
                if (d.lifecycle_status === deviceLifecycle_1.DeviceLifecycleStatus.SCRAPPED)
                    continue;
                if (d.lifecycle_status < deviceLifecycle_1.DeviceLifecycleStatus.ASSIGNED)
                    continue;
                const prevUnitId = d.unit_id;
                const prevUnitName = prevUnitId ? (unitMap.get(String(prevUnitId)) || '') : '';
                const nextLife = d.lifecycle_status >= deviceLifecycle_1.DeviceLifecycleStatus.PLATFORM_CONNECTED
                    ? deviceLifecycle_1.DeviceLifecycleStatus.PLATFORM_CONNECTED
                    : deviceLifecycle_1.DeviceLifecycleStatus.REGISTERED;
                await dev.update({
                    unit_id: null,
                    lifecycle_status: nextLife,
                    project_code: null,
                    building_id: null,
                    floor_id: null,
                    point_id: null,
                });
                await models_1.IoTDevice.update({ unit_id: null }, { where: { archive_device_id: d.id } });
                await logAllocation({
                    device_id: Number(d.id),
                    device_no: d.device_no || '',
                    device_name: d.device_name || '',
                    operation_type: 3,
                    prev_unit_id: prevUnitId,
                    prev_unit_name: prevUnitName,
                    new_unit_id: null,
                    new_unit_name: null,
                    project_code: null,
                    building_id: null,
                    floor_id: null,
                    point_id: null,
                    operator_id: operatorId,
                    operator_name: operatorName,
                    remark,
                });
                n += 1;
            }
            (0, respond_1.sendSuccess)(res, req, { count: n }, '已解除单位绑定');
        }
        catch (err) {
            logger_1.default.error(`[DeviceAllocation] unallocate 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    async reallocate(req, res) {
        try {
            const body = (req.body || {});
            const deviceId = String(body.deviceId || body.device_id || '').trim();
            const newUnitRaw = body.newUnitId || body.unit_id || body.unitId;
            const newUnitId = newUnitRaw != null && String(newUnitRaw).trim() !== '' ? parseInt(String(newUnitRaw), 10) : NaN;
            if (!deviceId)
                throw new httpError_1.HttpError('缺少 deviceId', 400, 400);
            if (!Number.isFinite(newUnitId) || newUnitId <= 0)
                throw new httpError_1.HttpError('请选择有效单位', 400, 400);
            const unit = await models_1.Unit.findByPk(newUnitId);
            if (!unit)
                throw new httpError_1.HttpError('单位不存在', 404, 404);
            const newUnitName = unit.unit_name || '';
            const dev = await models_1.Device.findByPk(deviceId);
            if (!dev)
                throw new httpError_1.HttpError('设备不存在', 404, 404);
            const d = dev;
            if (d.lifecycle_status === deviceLifecycle_1.DeviceLifecycleStatus.SCRAPPED) {
                throw new httpError_1.HttpError('设备已报废', 400, 400);
            }
            if (d.lifecycle_status < deviceLifecycle_1.DeviceLifecycleStatus.PLATFORM_CONNECTED) {
                throw new httpError_1.HttpError('设备尚未接入，无法改派', 400, 400);
            }
            const prevUnitId = d.unit_id;
            let prevUnitName = '';
            if (prevUnitId) {
                const prevUnit = await models_1.Unit.findByPk(prevUnitId);
                if (prevUnit)
                    prevUnitName = prevUnit.unit_name || '';
            }
            const projectCode = body.project_code != null ? String(body.project_code).slice(0, 64) : d.project_code;
            const buildingId = body.building_id != null && body.building_id !== '' ? Number(body.building_id) : d.building_id;
            const floorId = body.floor_id != null && body.floor_id !== '' ? Number(body.floor_id) : d.floor_id;
            const pointId = body.point_id != null && body.point_id !== '' ? Number(body.point_id) : d.point_id;
            const operatorId = body.operator_id != null && body.operator_id !== '' ? Number(body.operator_id) : null;
            const operatorName = body.operator_name != null ? String(body.operator_name) : null;
            const remark = body.remark != null ? String(body.remark).slice(0, 500) : null;
            await dev.update({
                unit_id: newUnitId,
                lifecycle_status: deviceLifecycle_1.DeviceLifecycleStatus.ASSIGNED,
                project_code: projectCode,
                building_id: buildingId,
                floor_id: floorId,
                point_id: pointId,
            });
            await models_1.IoTDevice.update({ unit_id: newUnitId }, { where: { archive_device_id: d.id } });
            /* 同步更新维保记录中的单位名称，避免改派后维护台账显示旧单位 */
            await database_1.default.query(`UPDATE fire_device_maintenance SET unit_name = :newUnitName WHERE device_id = :deviceId`, { replacements: { newUnitName, deviceId: d.id } });
            await logAllocation({
                device_id: Number(d.id),
                device_no: d.device_no || '',
                device_name: d.device_name || '',
                operation_type: 2,
                prev_unit_id: prevUnitId,
                prev_unit_name: prevUnitName,
                new_unit_id: newUnitId,
                new_unit_name: newUnitName,
                project_code: projectCode,
                building_id: buildingId,
                floor_id: floorId,
                point_id: pointId,
                operator_id: operatorId,
                operator_name: operatorName,
                remark,
            });
            (0, respond_1.sendSuccess)(res, req, null, '改派成功');
        }
        catch (err) {
            logger_1.default.error(`[DeviceAllocation] reallocate 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
    /** 分配日志列表 */
    async listLogs(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { deviceId, operationType } = req.query;
            const whereClauses = ['1=1'];
            const replacements = {};
            if (deviceId) {
                const did = parseInt(String(deviceId), 10);
                if (Number.isFinite(did) && did > 0) {
                    whereClauses.push('device_id = :deviceId');
                    replacements.deviceId = did;
                }
            }
            if (operationType) {
                const ot = parseInt(String(operationType), 10);
                if (Number.isFinite(ot) && ot > 0) {
                    whereClauses.push('operation_type = :operationType');
                    replacements.operationType = ot;
                }
            }
            const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
            const [countRows] = await database_1.default.query(`SELECT COUNT(*) AS total FROM fire_device_allocation_log ${whereSql}`, { replacements, type: 'SELECT' });
            const total = Number(countRows?.total ?? 0);
            const rows = await database_1.default.query(`SELECT * FROM fire_device_allocation_log
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT :limit OFFSET :offset`, {
                replacements: { ...replacements, limit: pageSize, offset: (pageNum - 1) * pageSize },
                type: 'SELECT',
            });
            (0, respond_1.sendPage)(res, req, rows, total, pageNum, pageSize);
        }
        catch (err) {
            logger_1.default.error(`[DeviceAllocation] listLogs 失败: ${err?.message || err}`);
            throw new httpError_1.HttpError(`操作失败: ${err?.message || '未知错误'}`, 500);
        }
    },
};
//# sourceMappingURL=deviceAllocation.controller.js.map