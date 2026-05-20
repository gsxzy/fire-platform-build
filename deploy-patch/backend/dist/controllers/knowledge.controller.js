"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeController = void 0;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
const logger_1 = __importDefault(require("@/config/logger"));
const cache_1 = require("@/utils/cache");
exports.KnowledgeController = {
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { category, keyword } = req.query;
        const where = {};
        if (category)
            where.category = category;
        let rows;
        let count;
        if (keyword && String(keyword).trim()) {
            // 优先使用 FULLTEXT 全文检索（MySQL 5.6+）
            const kw = String(keyword).trim();
            try {
                const [results, total] = await Promise.all([
                    models_1.KnowledgeDoc.sequelize.query(`SELECT * FROM fire_knowledge_doc WHERE MATCH(title, content) AGAINST(:kw IN BOOLEAN MODE) ${category ? 'AND category = :cat' : ''} ORDER BY id DESC LIMIT :limit OFFSET :offset`, { replacements: { kw: `${kw}*`, cat: category, limit: +pageSize, offset: (+pageNum - 1) * +pageSize }, type: 'SELECT' }),
                    models_1.KnowledgeDoc.sequelize.query(`SELECT COUNT(*) as total FROM fire_knowledge_doc WHERE MATCH(title, content) AGAINST(:kw IN BOOLEAN MODE) ${category ? 'AND category = :cat' : ''}`, { replacements: { kw: `${kw}*`, cat: category }, type: 'SELECT' }),
                ]);
                rows = results;
                count = Number(total[0]?.total || 0);
            }
            catch (err) {
                logger_1.default.warn(`[Knowledge] FULLTEXT search failed, fallback to LIKE: ${err.message}`);
                where[sequelize_1.Op.or] = [
                    { title: { [sequelize_1.Op.like]: `%${kw}%` } },
                    { content: { [sequelize_1.Op.like]: `%${kw}%` } },
                ];
                const result = await models_1.KnowledgeDoc.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
                rows = result.rows;
                count = result.count;
            }
        }
        else {
            const result = await models_1.KnowledgeDoc.findAndCountAll({ where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize });
            rows = result.rows;
            count = result.count;
        }
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async byId(req, res) {
        const doc = await models_1.KnowledgeDoc.findByPk(req.params.id);
        (0, respond_1.sendSuccess)(res, req, doc || null);
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
        const data = await (0, cache_1.withCache)(cache_1.CacheTags.SYSTEM_CONFIG, 'knowledge:categories', async () => {
            // 优先从 doc_categories 独立分类表读取
            const cats = await models_1.DocCategory.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']], raw: true });
            if (cats.length > 0) {
                return cats.map(c => ({ id: c.id, name: c.name, parentId: c.parent_id }));
            }
            // 降级：从文档记录动态提取（兼容旧数据）
            const docCats = await models_1.KnowledgeDoc.findAll({
                attributes: ['category'],
                group: ['category'],
                raw: true,
                limit: 1000,
            });
            return docCats.map((c) => c.category);
        }, { ttl: 300 });
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async categoryList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { count, rows } = await models_1.DocCategory.findAndCountAll({
            order: [['sort_order', 'ASC'], ['id', 'ASC']],
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async categoryCreate(req, res) {
        const c = await models_1.DocCategory.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: c.id }, '创建成功');
    },
    async categoryUpdate(req, res) {
        await models_1.DocCategory.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async categoryDelete(req, res) {
        await models_1.DocCategory.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async upload(req, res) {
        const file = req.file;
        if (!file)
            throw new Error('未收到文件');
        const url = `/uploads/${file.fieldname}/${file.filename}`;
        (0, respond_1.sendSuccess)(res, req, { url, originalName: file.originalname, size: file.size }, '上传成功');
    },
};
//# sourceMappingURL=knowledge.controller.js.map