import PageTemplate from '@/sections/PageTemplate';
import { documentService } from '@/api/services';
import { BookMarked } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '文档编号', width: '120px' },
  { key: 'title', label: '文档标题', width: '200px' },
  { key: 'category', label: '分类', width: '120px' },
  { key: 'docType', label: '文档类型', width: '100px' },
  { key: 'author', label: '编写人', width: '100px' },
  { key: 'date', label: '发布日期', width: '110px' },
  { key: 'version', label: '版本', width: '80px' },
  { key: 'status', label: '状态', width: '90px' },
];

const FIELDS = [
  { key: 'id', label: '文档编号', type: 'text' as const, required: true },
  { key: 'title', label: '文档标题', type: 'text' as const, required: true },
  { key: 'category', label: '分类', type: 'text' as const },
  { key: 'docType', label: '文档类型', type: 'text' as const },
  { key: 'author', label: '编写人', type: 'text' as const },
  { key: 'date', label: '发布日期', type: 'date' as const },
  { key: 'version', label: '版本', type: 'text' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['active', 'revoked', 'revising'] },
];

export default function KnowledgePage() {
  return <PageTemplate title="知识库" icon={BookMarked} columns={COLUMNS} service={documentService as any} fields={FIELDS} />;
}
