"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
exports.TrainingController = {
    async courseList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { count, rows } = await models_1.TrainingCourse.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
            return res.json((0, response_1.page)(rows, count, +pageNum, +pageSize));
        }
        catch (err) {
            logger_1.default.error(`[TrainingController] courseList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async courseCreate(req, res) {
        try {
            const c = await models_1.TrainingCourse.create((0, validator_1.sanitizeBody)(req.body));
            return res.json((0, response_1.success)({ id: c.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[TrainingController] courseCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async courseUpdate(req, res) {
        try {
            await models_1.TrainingCourse.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[TrainingController] courseUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async courseDelete(req, res) {
        try {
            await models_1.TrainingCourse.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[TrainingController] courseDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async examList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { count, rows } = await models_1.TrainingExam.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
            return res.json((0, response_1.page)(rows, count, +pageNum, +pageSize));
        }
        catch (err) {
            logger_1.default.error(`[TrainingController] examList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async examCreate(req, res) {
        try {
            const e = await models_1.TrainingExam.create((0, validator_1.sanitizeBody)(req.body));
            return res.json((0, response_1.success)({ id: e.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[TrainingController] examCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=training.controller.js.map