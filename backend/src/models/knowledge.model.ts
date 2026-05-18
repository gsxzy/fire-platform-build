import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 10. 知识库 ── */
export const KnowledgeDoc = sequelize.define('knowledge_doc', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  category: { type: DataTypes.STRING(30), allowNull: false },
  content: DataTypes.TEXT('long'),
  file_url: DataTypes.STRING(500),
  tags: DataTypes.STRING(200),
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
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

export const DocCategory = sequelize.define('doc_category', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  parent_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'doc_categories',
  comment: '知识库分类表',
  timestamps: true,
  underscored: true,
});
