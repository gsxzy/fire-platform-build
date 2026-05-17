"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const logger_1 = __importDefault(require("@/config/logger"));
const validator_1 = require("@/utils/validator");
exports.AIController = {
    async decisionList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { count, rows } = await models_1.AIDecision.findAndCountAll({
                limit: +pageSize,
                offset: (+pageNum - 1) * +pageSize,
                order: [['created_at', 'DESC']],
            });
            return res.json((0, response_1.page)(rows, count, +pageNum, +pageSize));
        }
        catch (err) {
            logger_1.default.error(`[AI] decisionList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async decisionCreate(req, res) {
        try {
            const decisionNo = `AI${Date.now()}${Math.floor(Math.random() * 100)}`;
            const d = await models_1.AIDecision.create({ ...req.body, decision_no: decisionNo });
            return res.json((0, response_1.success)({ id: d.id }, '分析完成'));
        }
        catch (err) {
            logger_1.default.error(`[AI] decisionCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async alertList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { status } = req.query;
            const where = {};
            if (status !== undefined)
                where.status = status;
            const { count, rows } = await models_1.SmartAlert.findAndCountAll({
                where,
                limit: +pageSize,
                offset: (+pageNum - 1) * +pageSize,
                order: [['created_at', 'DESC']],
            });
            return res.json((0, response_1.page)(rows, count, +pageNum, +pageSize));
        }
        catch (err) {
            logger_1.default.error(`[AI] alertList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async alertConfirm(req, res) {
        try {
            await models_1.SmartAlert.update({ status: 1 }, { where: { id: req.params.id } });
            return res.json((0, response_1.success)(null, '已确认'));
        }
        catch (err) {
            logger_1.default.error(`[AI] alertConfirm 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async alertHandle(req, res) {
        try {
            await models_1.SmartAlert.update({ status: 2 }, { where: { id: req.params.id } });
            return res.json((0, response_1.success)(null, '已处理'));
        }
        catch (err) {
            logger_1.default.error(`[AI] alertHandle 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=ai.controller.js.map