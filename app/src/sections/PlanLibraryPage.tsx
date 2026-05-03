import PageTemplate from '@/sections/PageTemplate';
import { planService } from '@/api/services';
import { BookOpen } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '预案编号', width: '120px' },
  { key: 'name', label: '预案名称', width: '180px' },
  { key: 'unitName', label: '适用单位', width: '180px' },
  { key: 'type', label: '预案类型', width: '100px' },
  { key: 'level', label: '预案级别', width: '100px' },
  { key: 'version', label: '版本号', width: '80px' },
  { key: 'updateDate', label: '更新日期', width: '110px' },
  { key: 'status', label: '状态', width: '90px' },
];

const FIELDS = [
  { key: 'id', label: '预案编号', type: 'text' as const, required: true },
  { key: 'name', label: '预案名称', type: 'text' as const, required: true },
  { key: 'unitName', label: '适用单位', type: 'text' as const, required: true },
  { key: 'type', label: '预案类型', type: 'text' as const },
  { key: 'level', label: '预案级别', type: 'text' as const },
  { key: 'version', label: '版本号', type: 'text' as const },
  { key: 'updateDate', label: '更新日期', type: 'date' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['active', 'revoked', 'revising'] },
];

export default function PlanLibraryPage() {
  return <PageTemplate title="预案库" icon={BookOpen} columns={COLUMNS} service={planService as any} fields={FIELDS} />;
}
