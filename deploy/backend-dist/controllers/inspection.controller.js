"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InspectionController = void 0;
const sequelize_1 = require("sequelize");
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
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
exports.InspectionController = {
    async list(req, res) {
        try {
            const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
            const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
            const { inspectType, status, keyword } = req.query;
            const where = {};
            if (inspectType)
                where.inspect_type = inspectType;
            if (status !== undefined)
                where.status = status;
            if (keyword)
                where[sequelize_1.Op.or] = [{ inspect_no: { [sequelize_1.Op.like]: `%${keyword}%` } }, { unit_name: { [sequelize_1.Op.like]: `%${keyword}%` } }];
            const { count, rows } = await models_1.FireInspection.findAndCountAll({ where, limit: pageSize, offset: (pageNum - 1) * pageSize, order: [['created_at', 'DESC']] });
            return res.json((0, response_1.page)(rows, count, pageNum, pageSize));
        }
        catch (err) {
            logger_1.default.error(`[InspectionController] list 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async create(req, res) {
        try {
            const inspectNo = `IN${Date.now()}${Math.floor(Math.random() * 100)}`;
            const i = await models_1.FireInspection.create({ ...sanitizeBody(req.body), inspect_no: inspectNo });
            return res.json((0, response_1.success)({ id: i.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[InspectionController] create 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async update(req, res) {
        try {
            await models_1.FireInspection.update(sanitizeBody(req.body), { where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[InspectionController] update 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async delete(req, res) {
        try {
            await models_1.FireInspection.destroy({ where: { id: sanitizeId(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[InspectionController] delete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=inspection.controller.js.map