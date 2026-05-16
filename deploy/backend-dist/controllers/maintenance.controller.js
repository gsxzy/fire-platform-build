"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceController = void 0;
const sequelize_1 = require("sequelize");
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
function sanitizeId(id) {
    const n = parseInt(id, 10);
    if (isNaN(n) || n <= 0)
        throw new Error('无效ID');
    return n;
}
function sanitizeBody(body) {
    if (!body || typeof body !== 'object')
        return {};
    const b = body;
    const result = {};
    for (const key of Object.keys(b)) {
        if (key !== 'id')
            result[key] = b[key];
    }
    return result;
}
exports.MaintenanceController = {
    /* ── 维保单位 ── */
    async companyList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { keyword } = req.query;
            const where = {};
            if (keyword)
                where.company_name = { [sequelize_1.Op.like]: `%${keyword}%` };
            const { count, rows } = await models_1.MaintenanceCompany.findAndCountAll({ where, limit: pageSize, offset: (pageNum - 1) * pageSize });
            return res.json((0, response_1.page)(rows, count, pageNum, pageSize));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] companyList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async companyCreate(req, res) {
        try {
            const c = await models_1.MaintenanceCompany.create(sanitizeBody(req.body));
            return res.json((0, response_1.success)({ id: c.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] companyCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async companyUpdate(req, res) {
        try {
            await models_1.MaintenanceCompany.update(sanitizeBody(req.body), { where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] companyUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async companyDelete(req, res) {
        try {
            await models_1.MaintenanceCompany.destroy({ where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] companyDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 维保合同 ── */
    async contractList(req, res) {
        try {
            const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
            const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
            const { count, rows } = await models_1.MaintenanceContract.findAndCountAll({ limit: pageSize, offset: (pageNum - 1) * pageSize });
            return res.json((0, response_1.page)(rows, count, pageNum, pageSize));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] contractList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async contractCreate(req, res) {
        try {
            const c = await models_1.MaintenanceContract.create(sanitizeBody(req.body));
            return res.json((0, response_1.success)({ id: c.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] contractCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async contractUpdate(req, res) {
        try {
            await models_1.MaintenanceContract.update(sanitizeBody(req.body), { where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] contractUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async contractDelete(req, res) {
        try {
            await models_1.MaintenanceContract.destroy({ where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] contractDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 维保工单 ── */
    async workOrderList(req, res) {
        try {
            const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
            const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
            const { status, orderType, priority, keyword } = req.query;
            const where = {};
            if (status !== undefined)
                where.status = status;
            if (orderType)
                where.order_type = orderType;
            if (priority)
                where.priority = priority;
            if (keyword)
                where[sequelize_1.Op.or] = [{ order_no: { [sequelize_1.Op.like]: `%${keyword}%` } }, { device_name: { [sequelize_1.Op.like]: `%${keyword}%` } }];
            const { count, rows } = await models_1.MaintenanceWorkOrder.findAndCountAll({
                where, limit: pageSize, offset: (pageNum - 1) * pageSize,
                order: [['created_at', 'DESC']],
            });
            return res.json((0, response_1.page)(rows, count, pageNum, pageSize));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] workOrderList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async workOrderCreate(req, res) {
        try {
            const orderNo = `WO${Date.now()}${Math.floor(Math.random() * 100)}`;
            const wo = await models_1.MaintenanceWorkOrder.create({ ...sanitizeBody(req.body), order_no: orderNo });
            return res.json((0, response_1.success)({ id: wo.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] workOrderCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async workOrderUpdate(req, res) {
        try {
            await models_1.MaintenanceWorkOrder.update(sanitizeBody(req.body), { where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] workOrderUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async workOrderDelete(req, res) {
        try {
            await models_1.MaintenanceWorkOrder.destroy({ where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] workOrderDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async workOrderAssign(req, res) {
        try {
            const { assigneeId, assigneeName, planStart, planEnd } = req.body;
            await models_1.MaintenanceWorkOrder.update({
                assignee_id: assigneeId, assignee_name: assigneeName,
                plan_start: planStart, plan_end: planEnd, status: 1
            }, { where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '派单成功'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] workOrderAssign 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async workOrderComplete(req, res) {
        try {
            const { handleResult, materialCost, laborCost } = req.body;
            await models_1.MaintenanceWorkOrder.update({
                handle_result: handleResult, material_cost: materialCost,
                labor_cost: laborCost, actual_end: new Date(), status: 2
            }, { where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '工单已完成'));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] workOrderComplete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async stats(req, res) {
        try {
            const [total, pending, processing, completed, todayCount] = await Promise.all([
                models_1.MaintenanceWorkOrder.count(),
                models_1.MaintenanceWorkOrder.count({ where: { status: 0 } }),
                models_1.MaintenanceWorkOrder.count({ where: { status: 1 } }),
                models_1.MaintenanceWorkOrder.count({ where: { status: 2 } }),
                models_1.MaintenanceWorkOrder.count({ where: { created_at: { [sequelize_1.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
            ]);
            return res.json((0, response_1.success)({ total, pending, processing, completed, today: todayCount }));
        }
        catch (err) {
            logger_1.default.error(`[MaintenanceController] stats 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=maintenance.controller.js.map