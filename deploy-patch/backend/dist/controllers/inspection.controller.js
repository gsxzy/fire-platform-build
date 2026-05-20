"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InspectionController = void 0;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
const httpError_1 = require("@/utils/httpError");
const logger_1 = __importDefault(require("@/config/logger"));
function parsePage(req) {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    return { pageNum, pageSize };
}
exports.InspectionController = {
    /* ── 检查记录 ── */
    async list(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { inspectType, status, keyword } = req.query;
        const where = {};
        if (inspectType)
            where.inspect_type = inspectType;
        if (status !== undefined && status !== '')
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
        const body = (0, validator_1.sanitizeBody)(req.body);
        const inspectNo = `IN${Date.now()}${Math.floor(Math.random() * 100)}`;
        // 如果传了 template_id，自动展开检查项
        let items = body.items;
        const tplId = body.template_id ? parseInt(String(body.template_id), 10) : NaN;
        if (Number.isFinite(tplId) && !items) {
            const tpl = await models_1.InspectionTemplate.findByPk(tplId);
            if (tpl?.items)
                items = tpl.items;
        }
        const i = await models_1.FireInspection.create({ ...body, inspect_no: inspectNo, items });
        // 整改闭环：不合格/限期整改时自动创建隐患
        const result = parseInt(String(body.result), 10);
        if (result === 2 || result === 3) {
            await createHazardFromInspection(i.id, body, result);
        }
        (0, respond_1.sendSuccess)(res, req, { id: i.id }, '创建成功');
    },
    async update(req, res) {
        const body = (0, validator_1.sanitizeBody)(req.body);
        const id = (0, validator_1.parseIdStrict)(req.params.id);
        const prev = await models_1.FireInspection.findByPk(id);
        if (!prev)
            throw new httpError_1.HttpError('记录不存在', 404, 404);
        await models_1.FireInspection.update(body, { where: { id } });
        // 整改闭环：更新后如果结果为不合格且之前没有关联隐患，则创建
        const newResult = body.result !== undefined ? parseInt(String(body.result), 10) : prev.result;
        if ((newResult === 2 || newResult === 3) && !prev.hazard_id) {
            await createHazardFromInspection(id, { ...prev, ...body }, newResult);
        }
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async delete(req, res) {
        await models_1.FireInspection.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    /* ── 检查项模板 ── */
    async templateList(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { count, rows } = await models_1.InspectionTemplate.findAndCountAll({
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async templateCreate(req, res) {
        const t = await models_1.InspectionTemplate.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: t.id }, '创建成功');
    },
    async templateUpdate(req, res) {
        await models_1.InspectionTemplate.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async templateDelete(req, res) {
        await models_1.InspectionTemplate.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
};
/** 不合格/限期整改时自动创建隐患记录 */
async function createHazardFromInspection(inspectionId, body, result) {
    try {
        const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
        const hazard = await models_1.Hazard.create({
            hazard_no: hazardNo,
            unit_id: body.unit_id || null,
            unit_name: body.unit_name || '',
            description: body.items
                ? `消防检查发现隐患：${typeof body.items === 'string' ? body.items : JSON.stringify(body.items)}`
                : '消防检查不合格',
            level: result === 3 ? 2 : 1,
            status: 0,
            deadline: new Date(Date.now() + 7 * 86400000),
        });
        await models_1.FireInspection.update({ hazard_id: hazard.id, status: 2 }, { where: { id: inspectionId } });
    }
    catch (e) {
        logger_1.default.error(`[Inspection] 创建隐患失败: ${e.message}`);
    }
}
//# sourceMappingURL=inspection.controller.js.map