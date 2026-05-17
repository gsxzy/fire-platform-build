"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeController = void 0;
const sequelize_1 = require("sequelize");
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
exports.KnowledgeController = {
    async list(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { category, keyword } = req.query;
            const where = {};
            if (category)
                where.category = category;
            if (keyword)
                where[sequelize_1.Op.or] = [{ title: { [sequelize_1.Op.like]: `%${keyword}%` } }, { content: { [sequelize_1.Op.like]: `%${keyword}%` } }];
            const { count, rows } = await models_1.KnowledgeDoc.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
            return res.json((0, response_1.page)(rows, count, +pageNum, +pageSize));
        }
        catch (err) {
            logger_1.default.error(`[KnowledgeController] list 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async create(req, res) {
        try {
            const doc = await models_1.KnowledgeDoc.create((0, validator_1.sanitizeBody)(req.body));
            return res.json((0, response_1.success)({ id: doc.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[KnowledgeController] create 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async update(req, res) {
        try {
            await models_1.KnowledgeDoc.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[KnowledgeController] update 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async delete(req, res) {
        try {
            await models_1.KnowledgeDoc.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[KnowledgeController] delete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async categories(req, res) {
        try {
            const cats = await models_1.KnowledgeDoc.findAll({ attributes: ['category'], group: ['category'], raw: true, limit: 1000 });
            return res.json((0, response_1.success)(cats.map((c) => c.category)));
        }
        catch (err) {
            logger_1.default.error(`[KnowledgeController] categories 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=knowledge.controller.js.map