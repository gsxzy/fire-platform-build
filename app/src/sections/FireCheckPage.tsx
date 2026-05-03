import PageTemplate from '@/sections/PageTemplate';
import { inspectionService } from '@/api/services';
import { ClipboardCheck } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '检查编号', width: '120px' },
  { key: 'name', label: '检查项目', width: '180px' },
  { key: 'unitName', label: '检查单位', width: '180px' },
  { key: 'checker', label: '检查人', width: '100px' },
  { key: 'date', label: '检查日期', width: '110px' },
  { key: 'result', label: '结果', width: '100px' },
  { key: 'status', label: '整改状态', width: '100px' },
];

const FIELDS = [
  { key: 'id', label: '检查编号', type: 'text' as const, required: true },
  { key: 'name', label: '检查项目', type: 'text' as const, required: true },
  { key: 'unitName', label: '检查单位', type: 'text' as const, required: true },
  { key: 'checker', label: '检查人', type: 'text' as const },
  { key: 'date', label: '检查日期', type: 'date' as const },
  { key: 'result', label: '结果', type: 'select' as const, options: ['pass', 'fail', 'partial'] },
  { key: 'status', label: '整改状态', type: 'select' as const, options: ['no-need', 'pending', 'rectifying', 'completed'] },
];

export default function FireCheckPage() {
  return <PageTemplate title="消防检查" icon={ClipboardCheck} columns={COLUMNS} service={inspectionService as any} fields={FIELDS} />;
}
