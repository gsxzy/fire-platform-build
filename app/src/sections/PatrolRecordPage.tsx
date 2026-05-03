import PageTemplate from '@/sections/PageTemplate';
import { patrolRecordService } from '@/api/services';
import { ClipboardCheck } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '记录编号', width: '120px' },
  { key: 'unitName', label: '巡检单位', width: '180px' },
  { key: 'date', label: '巡检日期', width: '110px' },
  { key: 'items', label: '巡检项', width: '80px' },
  { key: 'passed', label: '通过数', width: '80px' },
  { key: 'failed', label: '异常数', width: '80px' },
  { key: 'staff', label: '巡检人', width: '100px' },
  { key: 'status', label: '结果', width: '100px' },
];

const FIELDS = [
  { key: 'id', label: '记录编号', type: 'text' as const, required: true },
  { key: 'unitName', label: '巡检单位', type: 'text' as const, required: true },
  { key: 'date', label: '巡检日期', type: 'date' as const },
  { key: 'items', label: '巡检项', type: 'number' as const },
  { key: 'passed', label: '通过数', type: 'number' as const },
  { key: 'failed', label: '异常数', type: 'number' as const },
  { key: 'staff', label: '巡检人', type: 'text' as const },
  { key: 'status', label: '结果', type: 'select' as const, options: ['all-normal', 'has-issue'] },
];

export default function PatrolRecordPage() {
  return <PageTemplate title="巡检记录" icon={ClipboardCheck} columns={COLUMNS} service={patrolRecordService as any} fields={FIELDS} />;
}
