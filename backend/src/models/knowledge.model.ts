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
}, { tableName: 'fire_knowledge_doc', comment: '知识库文档表' });
