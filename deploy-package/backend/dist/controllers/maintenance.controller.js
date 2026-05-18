"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceController = void 0;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
function parsePage(req) {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    return { pageNum, pageSize };
}
exports.MaintenanceController = {
    async companyList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { keyword } = req.query;
        const where = {};
        if (keyword)
            where.company_name = { [sequelize_1.Op.like]: `%${keyword}%` };
        const { count, rows } = await models_1.MaintenanceCompany.findAndCountAll({
            where,
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async companyCreate(req, res) {
        const c = await models_1.MaintenanceCompany.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: c.id }, '创建成功');
    },
    async companyUpdate(req, res) {
        await models_1.MaintenanceCompany.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async companyDelete(req, res) {
        await models_1.MaintenanceCompany.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async contractList(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { count, rows } = await models_1.MaintenanceContract.findAndCountAll({
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async contractCreate(req, res) {
        const c = await models_1.MaintenanceContract.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: c.id }, '创建成功');
    },
    async contractUpdate(req, res) {
        await models_1.MaintenanceContract.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async contractDelete(req, res) {
        await models_1.MaintenanceContract.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async workOrderList(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { status, orderType, priority, keyword } = req.query;
        const where = {};
        if (status !== undefined)
            where.status = status;
        if (orderType)
            where.order_type = orderType;
        if (priority)
            where.priority = priority;
        if (keyword) {
            where[sequelize_1.Op.or] = [
                { order_no: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { device_name: { [sequelize_1.Op.like]: `%${keyword}%` } },
            ];
        }
        const { count, rows } = await models_1.MaintenanceWorkOrder.findAndCountAll({
            where,
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async workOrderCreate(req, res) {
        const orderNo = `WO${Date.now()}${Math.floor(Math.random() * 100)}`;
        const wo = await models_1.MaintenanceWorkOrder.create({ ...(0, validator_1.sanitizeBody)(req.body), order_no: orderNo });
        (0, respond_1.sendSuccess)(res, req, { id: wo.id }, '创建成功');
    },
    async workOrderUpdate(req, res) {
        await models_1.MaintenanceWorkOrder.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async workOrderDelete(req, res) {
        await models_1.MaintenanceWorkOrder.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async workOrderAssign(req, res) {
        const { assigneeId, assigneeName, planStart, planEnd } = req.body;
        await models_1.MaintenanceWorkOrder.update({
            assignee_id: assigneeId,
            assignee_name: assigneeName,
            plan_start: planStart,
            plan_end: planEnd,
            status: 1,
        }, { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '派单成功');
    },
    async workOrderComplete(req, res) {
        const { handleResult, materialCost, laborCost } = req.body;
        await models_1.MaintenanceWorkOrder.update({
            handle_result: handleResult,
            material_cost: materialCost,
            labor_cost: laborCost,
            actual_end: new Date(),
            status: 2,
        }, { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '工单已完成');
    },
    async stats(req, res) {
        const [total, pending, processing, completed, todayCount] = await Promise.all([
            models_1.MaintenanceWorkOrder.count(),
            models_1.MaintenanceWorkOrder.count({ where: { status: 0 } }),
            models_1.MaintenanceWorkOrder.count({ where: { status: 1 } }),
            models_1.MaintenanceWorkOrder.count({ where: { status: 2 } }),
            models_1.MaintenanceWorkOrder.count({
                where: { created_at: { [sequelize_1.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } },
            }),
        ]);
        (0, respond_1.sendSuccess)(res, req, { total, pending, processing, completed, today: todayCount });
    },
};
//# sourceMappingURL=maintenance.controller.js.map