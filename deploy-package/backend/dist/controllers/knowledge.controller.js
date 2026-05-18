"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeController = void 0;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
exports.KnowledgeController = {
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { category, keyword } = req.query;
        const where = {};
        if (category)
            where.category = category;
        if (keyword) {
            where[sequelize_1.Op.or] = [
                { title: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { content: { [sequelize_1.Op.like]: `%${keyword}%` } },
            ];
        }
        const { count, rows } = await models_1.KnowledgeDoc.findAndCountAll({
            where,
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async create(req, res) {
        const doc = await models_1.KnowledgeDoc.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: doc.id }, '创建成功');
    },
    async update(req, res) {
        await models_1.KnowledgeDoc.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async delete(req, res) {
        await models_1.KnowledgeDoc.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async categories(req, res) {
        const cats = await models_1.KnowledgeDoc.findAll({
            attributes: ['category'],
            group: ['category'],
            raw: true,
            limit: 1000,
        });
        (0, respond_1.sendSuccess)(res, req, cats.map((c) => c.category));
    },
};
//# sourceMappingURL=knowledge.controller.js.map