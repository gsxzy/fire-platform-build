"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatrolController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
exports.PatrolController = {
    /* ── 巡检计划 ── */
    async planList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { status } = req.query;
            const where = {};
            if (status !== undefined)
                where.status = status;
            const { count, rows } = await models_1.PatrolPlan.findAndCountAll({ where, limit: pageSize, offset: (pageNum - 1) * pageSize });
            return res.json((0, response_1.page)(rows, count, pageNum, pageSize));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] planList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async planCreate(req, res) {
        try {
            const p = await models_1.PatrolPlan.create((0, validator_1.sanitizeBody)(req.body));
            return res.json((0, response_1.success)({ id: p.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] planCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async planUpdate(req, res) {
        try {
            await models_1.PatrolPlan.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] planUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async planDelete(req, res) {
        try {
            await models_1.PatrolPlan.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] planDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 巡检记录 ── */
    async recordList(req, res) {
        try {
            const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
            const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
            const { count, rows } = await models_1.PatrolRecord.findAndCountAll({ limit: pageSize, offset: (pageNum - 1) * pageSize, order: [['created_at', 'DESC']] });
            return res.json((0, response_1.page)(rows, count, pageNum, pageSize));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] recordList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async recordById(req, res) {
        try {
            const r = await models_1.PatrolRecord.findByPk(req.params.id);
            return res.json((0, response_1.success)(r || null));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] recordById 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async recordCreate(req, res) {
        try {
            const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
            const r = await models_1.PatrolRecord.create({ ...(0, validator_1.sanitizeBody)(req.body), patrol_no: patrolNo });
            return res.json((0, response_1.success)({ id: r.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] recordCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async recordUpdate(req, res) {
        try {
            await models_1.PatrolRecord.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] recordUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async recordDelete(req, res) {
        try {
            await models_1.PatrolRecord.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] recordDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 隐患管理 ── */
    async hazardList(req, res) {
        try {
            const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
            const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
            const { status, level } = req.query;
            const where = {};
            if (status !== undefined)
                where.status = status;
            if (level)
                where.level = level;
            const { count, rows } = await models_1.Hazard.findAndCountAll({ where, limit: pageSize, offset: (pageNum - 1) * pageSize, order: [['created_at', 'DESC']] });
            return res.json((0, response_1.page)(rows, count, pageNum, pageSize));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] hazardList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hazardCreate(req, res) {
        try {
            const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
            const h = await models_1.Hazard.create({ ...(0, validator_1.sanitizeBody)(req.body), hazard_no: hazardNo });
            return res.json((0, response_1.success)({ id: h.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] hazardCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hazardUpdate(req, res) {
        try {
            await models_1.Hazard.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] hazardUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hazardDelete(req, res) {
        try {
            await models_1.Hazard.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] hazardDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hazardRectify(req, res) {
        try {
            await models_1.Hazard.update({ status: 2, rectification_date: new Date() }, { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '已整改'));
        }
        catch (err) {
            logger_1.default.error(`[PatrolController] hazardRectify 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=patrol.controller.js.map