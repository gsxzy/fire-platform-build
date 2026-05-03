import PageTemplate from '@/sections/PageTemplate';
import { hazardService } from '@/api/services';
import { AlertTriangle } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '隐患编号', width: '120px' },
  { key: 'unitName', label: '所属单位', width: '180px' },
  { key: 'description', label: '隐患描述', width: '250px' },
  { key: 'level', label: '等级', width: '80px' },
  { key: 'foundDate', label: '发现日期', width: '110px' },
  { key: 'deadline', label: '整改期限', width: '110px' },
  { key: 'status', label: '状态', width: '100px' },
];

const FIELDS = [
  { key: 'id', label: '隐患编号', type: 'text' as const, required: true },
  { key: 'unitName', label: '所属单位', type: 'text' as const, required: true },
  { key: 'description', label: '隐患描述', type: 'textarea' as const, required: true },
  { key: 'level', label: '等级', type: 'select' as const, options: ['urgent', 'high', 'normal', 'low'] },
  { key: 'foundDate', label: '发现日期', type: 'date' as const },
  { key: 'deadline', label: '整改期限', type: 'date' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['pending', 'rectifying', 'completed', 'closed'] },
];

export default function HazardPage() {
  return <PageTemplate title="隐患管理" icon={AlertTriangle} columns={COLUMNS} service={hazardService as any} fields={FIELDS} />;
}
