"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceMaintenanceController = void 0;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const httpError_1 = require("@/utils/httpError");
const models_1 = require("@/models");
const cache_1 = require("@/utils/cache");
async function fillDeviceMeta(deviceId) {
    const dev = (await models_1.Device.findByPk(deviceId));
    if (!dev)
        return { device_code: '', device_name: '', unit_name: '' };
    let unitName = '';
    if (dev.unit_id) {
        const u = (await models_1.Unit.findByPk(dev.unit_id));
        unitName = u?.unit_name || '';
    }
    return {
        device_code: dev.device_no || String(dev.id),
        device_name: dev.device_name || '',
        unit_name: unitName,
    };
}
exports.DeviceMaintenanceController = {
    async stats(req, res) {
        const data = await (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, 'deviceMaintenance:stats', async () => {
            const [pending, overdue, completed, inProgress] = await Promise.all([
                models_1.DeviceMaintenance.count({ where: { status: 'pending' } }),
                models_1.DeviceMaintenance.count({ where: { status: 'overdue' } }),
                models_1.DeviceMaintenance.count({ where: { status: 'completed' } }),
                models_1.DeviceMaintenance.count({ where: { status: 'in_progress' } }),
            ]);
            return { pending, overdue, completed, in_progress: inProgress };
        }, { ttl: 60 });
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async list(req, res) {
        const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
        const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? req.query.size ?? 10), 10) || 10));
        const { keyword, type, status } = req.query;
        const where = {};
        if (type)
            where.type = type;
        if (status !== undefined && status !== '')
            where.status = status;
        if (keyword) {
            const kw = String(keyword).trim();
            const orList = [
                { device_code: { [sequelize_1.Op.like]: `%${kw}%` } },
                { device_name: { [sequelize_1.Op.like]: `%${kw}%` } },
                { unit_name: { [sequelize_1.Op.like]: `%${kw}%` } },
            ];
            const kid = parseInt(kw, 10);
            if (Number.isFinite(kid) && kid > 0)
                orList.push({ device_id: kid });
            where[sequelize_1.Op.or] = orList;
        }
        const { count, rows } = await models_1.DeviceMaintenance.findAndCountAll({
            where,
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['plan_date', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async create(req, res) {
        const b = (req.body || {});
        const deviceId = b.device_id ?? b.deviceId;
        if (deviceId === undefined || deviceId === '') {
            throw new httpError_1.HttpError('device_id 不能为空', 400);
        }
        try {
            const meta = await fillDeviceMeta(deviceId);
            const row = await models_1.DeviceMaintenance.create({
                device_id: Number(deviceId),
                device_code: meta.device_code,
                device_name: meta.device_name,
                unit_name: meta.unit_name,
                type: String(b.type || 'inspection'),
                plan_date: b.plan_date || b.planDate,
                actual_date: b.actual_date || b.actualDate || null,
                executor: b.executor ? String(b.executor) : null,
                cost: b.cost !== undefined && b.cost !== '' ? Number(b.cost) : null,
                content: b.content ? String(b.content) : null,
                status: String(b.status || 'pending'),
            });
            (0, respond_1.sendSuccess)(res, req, { id: String(row.id) }, '创建成功');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : '创建失败';
            throw new httpError_1.HttpError(msg, 400);
        }
    },
    async update(req, res) {
        const b = (req.body || {});
        const payload = {};
        if (b.type !== undefined)
            payload.type = b.type;
        if (b.plan_date !== undefined || b.planDate !== undefined) {
            const pd = b.plan_date ?? b.planDate;
            payload.plan_date = pd === '' || pd == null ? null : pd;
        }
        if (b.actual_date !== undefined || b.actualDate !== undefined) {
            const ad = b.actual_date ?? b.actualDate;
            payload.actual_date = ad === '' || ad == null ? null : ad;
        }
        if (b.executor !== undefined)
            payload.executor = b.executor;
        if (b.cost !== undefined)
            payload.cost = b.cost === '' ? null : Number(b.cost);
        if (b.content !== undefined)
            payload.content = b.content;
        if (b.status !== undefined)
            payload.status = b.status;
        if (Object.keys(payload).length === 0) {
            (0, respond_1.sendSuccess)(res, req, null, '暂无更新内容');
            return;
        }
        const [n] = await models_1.DeviceMaintenance.update(payload, { where: { id: req.params.id } });
        if (!n)
            throw new httpError_1.HttpError('记录不存在', 404);
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async delete(req, res) {
        const n = await models_1.DeviceMaintenance.destroy({ where: { id: req.params.id } });
        if (!n)
            throw new httpError_1.HttpError('记录不存在', 404);
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
};
//# sourceMappingURL=deviceMaintenance.controller.js.map