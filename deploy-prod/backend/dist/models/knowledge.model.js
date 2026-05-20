"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocCategory = exports.KnowledgeDoc = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 10. 知识库 ── */
exports.KnowledgeDoc = database_1.default.define('knowledge_doc', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    category: { type: sequelize_1.DataTypes.STRING(30), allowNull: false },
    content: sequelize_1.DataTypes.TEXT('long'),
    file_url: sequelize_1.DataTypes.STRING(500),
    tags: sequelize_1.DataTypes.STRING(200),
    view_count: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, {
    tableName: 'fire_knowledge_doc',
    comment: '知识库文档表',
    indexes: [
        { name: 'idx_category', fields: ['category'] },
        { name: 'idx_status', fields: ['status'] },
        /* FULLTEXT 索引：支持 title + content 全文检索（MySQL 5.6+ / 8.0） */
        { type: 'FULLTEXT', name: 'ft_title_content', fields: ['title', 'content'] },
    ],
});
exports.DocCategory = database_1.default.define('doc_category', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    parent_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
    sort_order: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
}, {
    tableName: 'doc_categories',
    comment: '知识库分类表',
    timestamps: true,
    underscored: true,
});
//# sourceMappingURL=knowledge.model.js.map