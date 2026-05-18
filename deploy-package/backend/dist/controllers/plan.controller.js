"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanController = void 0;
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
function parsePage(req) {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    return { pageNum, pageSize };
}
exports.PlanController = {
    async planList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { count, rows } = await models_1.EmergencyPlan.findAndCountAll({
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async planCreate(req, res) {
        const p = await models_1.EmergencyPlan.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
    },
    async planUpdate(req, res) {
        await models_1.EmergencyPlan.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async planDelete(req, res) {
        await models_1.EmergencyPlan.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async drillList(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { count, rows } = await models_1.EmergencyDrill.findAndCountAll({
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async drillCreate(req, res) {
        const drillNo = `DR${Date.now()}${Math.floor(Math.random() * 100)}`;
        const d = await models_1.EmergencyDrill.create({ ...(0, validator_1.sanitizeBody)(req.body), drill_no: drillNo });
        (0, respond_1.sendSuccess)(res, req, { id: d.id }, '创建成功');
    },
    async drillUpdate(req, res) {
        await models_1.EmergencyDrill.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async drillDelete(req, res) {
        await models_1.EmergencyDrill.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
};
//# sourceMappingURL=plan.controller.js.map