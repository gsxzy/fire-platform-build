import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 10. 知识库 ── */
export const KnowledgeDoc = sequelize.define('knowledge_doc', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  category: { type: DataTypes.STRING(30), allowNull: false },
  content: DataTypes.TEXT,
  file_url: DataTypes.STRING(500),
  tags: DataTypes.STRING(200),
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
}, {
  tableName: 'fire_knowledge_doc',
  comment: '知识库文档表',
  indexes: [
    { fields: ['category'] },
    { fields: ['status'] },
    /* PostgreSQL 全文检索使用 GIN + to_tsvector，已在基线脚本中创建 idx_knowledge_fts */
  ],
});

export const DocCategory = sequelize.define('doc_category', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  parent_id: { type: DataTypes.BIGINT, defaultValue: 0 },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'doc_categories',
  comment: '知识库分类表',
  timestamps: true,
  underscored: true,
});
