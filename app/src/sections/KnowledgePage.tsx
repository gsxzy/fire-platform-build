import PageTemplate from '@/sections/PageTemplate';
import { knowledgeService } from '@/api/services';
import { BookMarked } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: 'ID', width: '72px' },
  { key: 'title', label: '标题', width: '200px' },
  { key: 'category', label: '分类', width: '100px' },
  { key: 'tags', label: '标签', width: '120px' },
  { key: 'view_count', label: '浏览', width: '64px' },
  {
    key: 'status',
    label: '状态',
    width: '80px',
    render: (v: unknown) => (v === 'active' ? '发布' : '下架'),
  },
];

const FIELDS = [
  { key: 'title', label: '标题', type: 'text' as const, required: true },
  { key: 'category', label: '分类', type: 'text' as const, required: true },
  { key: 'tags', label: '标签', type: 'text' as const },
  { key: 'file_url', label: '附件链接', type: 'text' as const },
  { key: 'content', label: '正文', type: 'textarea' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['active', 'inactive'] },
];

export default function KnowledgePage() {
  return (
    <PageTemplate
      title="知识库"
      icon={BookMarked}
      columns={COLUMNS}
      service={knowledgeService as any}
      fields={FIELDS}
      emptyDescription="法规、制度与培训文档。请在下方新增条目或核对后端 fire_knowledge_doc 表后刷新。"
    />
  );
}
