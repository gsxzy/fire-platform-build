"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatrolController = void 0;
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
function parsePage(req) {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    return { pageNum, pageSize };
}
exports.PatrolController = {
    async planList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { status } = req.query;
        const where = {};
        if (status !== undefined)
            where.status = status;
        const { count, rows } = await models_1.PatrolPlan.findAndCountAll({
            where,
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async planCreate(req, res) {
        const p = await models_1.PatrolPlan.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
    },
    async planUpdate(req, res) {
        await models_1.PatrolPlan.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async planDelete(req, res) {
        await models_1.PatrolPlan.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async recordList(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { count, rows } = await models_1.PatrolRecord.findAndCountAll({
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async recordById(req, res) {
        const r = await models_1.PatrolRecord.findByPk(req.params.id);
        (0, respond_1.sendSuccess)(res, req, r || null);
    },
    async recordCreate(req, res) {
        const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
        const r = await models_1.PatrolRecord.create({ ...(0, validator_1.sanitizeBody)(req.body), patrol_no: patrolNo });
        (0, respond_1.sendSuccess)(res, req, { id: r.id }, '创建成功');
    },
    async recordUpdate(req, res) {
        await models_1.PatrolRecord.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async recordDelete(req, res) {
        await models_1.PatrolRecord.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async hazardList(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { status, level } = req.query;
        const where = {};
        if (status !== undefined)
            where.status = status;
        if (level)
            where.level = level;
        const { count, rows } = await models_1.Hazard.findAndCountAll({
            where,
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async hazardCreate(req, res) {
        const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
        const h = await models_1.Hazard.create({ ...(0, validator_1.sanitizeBody)(req.body), hazard_no: hazardNo });
        (0, respond_1.sendSuccess)(res, req, { id: h.id }, '创建成功');
    },
    async hazardUpdate(req, res) {
        await models_1.Hazard.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async hazardDelete(req, res) {
        await models_1.Hazard.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async hazardRectify(req, res) {
        await models_1.Hazard.update({ status: 2, rectification_date: new Date() }, { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '已整改');
    },
};
//# sourceMappingURL=patrol.controller.js.map