"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanController = void 0;
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
exports.PlanController = {
    async planList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { count, rows } = await models_1.EmergencyPlan.findAndCountAll({ limit: pageSize, offset: (pageNum - 1) * pageSize });
            return res.json((0, response_1.page)(rows, count, pageNum, pageSize));
        }
        catch (err) {
            logger_1.default.error(`[PlanController] planList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async planCreate(req, res) {
        try {
            const p = await models_1.EmergencyPlan.create(sanitizeBody(req.body));
            return res.json((0, response_1.success)({ id: p.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[PlanController] planCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async planUpdate(req, res) {
        try {
            await models_1.EmergencyPlan.update(sanitizeBody(req.body), { where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[PlanController] planUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async planDelete(req, res) {
        try {
            await models_1.EmergencyPlan.destroy({ where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[PlanController] planDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async drillList(req, res) {
        try {
            const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
            const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
            const { count, rows } = await models_1.EmergencyDrill.findAndCountAll({ limit: pageSize, offset: (pageNum - 1) * pageSize, order: [['created_at', 'DESC']] });
            return res.json((0, response_1.page)(rows, count, pageNum, pageSize));
        }
        catch (err) {
            logger_1.default.error(`[PlanController] drillList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async drillCreate(req, res) {
        try {
            const drillNo = `DR${Date.now()}${Math.floor(Math.random() * 100)}`;
            const d = await models_1.EmergencyDrill.create({ ...sanitizeBody(req.body), drill_no: drillNo });
            return res.json((0, response_1.success)({ id: d.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[PlanController] drillCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async drillUpdate(req, res) {
        try {
            await models_1.EmergencyDrill.update(sanitizeBody(req.body), { where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[PlanController] drillUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async drillDelete(req, res) {
        try {
            await models_1.EmergencyDrill.destroy({ where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[PlanController] drillDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=plan.controller.js.map