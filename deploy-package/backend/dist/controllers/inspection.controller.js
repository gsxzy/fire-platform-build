"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InspectionController = void 0;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
function parsePage(req) {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    return { pageNum, pageSize };
}
exports.InspectionController = {
    async list(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { inspectType, status, keyword } = req.query;
        const where = {};
        if (inspectType)
            where.inspect_type = inspectType;
        if (status !== undefined)
            where.status = status;
        if (keyword) {
            where[sequelize_1.Op.or] = [
                { inspect_no: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { unit_name: { [sequelize_1.Op.like]: `%${keyword}%` } },
            ];
        }
        const { count, rows } = await models_1.FireInspection.findAndCountAll({
            where,
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async create(req, res) {
        const inspectNo = `IN${Date.now()}${Math.floor(Math.random() * 100)}`;
        const i = await models_1.FireInspection.create({ ...(0, validator_1.sanitizeBody)(req.body), inspect_no: inspectNo });
        (0, respond_1.sendSuccess)(res, req, { id: i.id }, '创建成功');
    },
    async update(req, res) {
        await models_1.FireInspection.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async delete(req, res) {
        await models_1.FireInspection.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
};
//# sourceMappingURL=inspection.controller.js.map