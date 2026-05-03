import PageTemplate from '@/sections/PageTemplate';
import { patrolPlanService } from '@/api/services';
import { ClipboardList } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '计划编号', width: '120px' },
  { key: 'name', label: '计划名称', width: '180px' },
  { key: 'unitName', label: '巡检单位', width: '180px' },
  { key: 'cycle', label: '巡检周期', width: '100px' },
  { key: 'items', label: '巡检项数', width: '90px' },
  { key: 'nextDate', label: '下次巡检', width: '110px' },
  { key: 'staff', label: '责任人', width: '100px' },
  { key: 'status', label: '状态', width: '80px' },
];

const FIELDS = [
  { key: 'id', label: '计划编号', type: 'text' as const, required: true },
  { key: 'name', label: '计划名称', type: 'text' as const, required: true },
  { key: 'unitName', label: '巡检单位', type: 'text' as const, required: true },
  { key: 'cycle', label: '巡检周期', type: 'select' as const, options: ['daily', 'weekly', 'monthly', 'quarterly'] },
  { key: 'items', label: '巡检项数', type: 'number' as const },
  { key: 'nextDate', label: '下次巡检', type: 'date' as const },
  { key: 'staff', label: '责任人', type: 'text' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['normal', 'fault', 'maintenance', 'offline', 'disabled'] },
];

export default function PatrolPlanPage() {
  return <PageTemplate title="巡检计划" icon={ClipboardList} columns={COLUMNS} service={patrolPlanService as any} fields={FIELDS} />;
}
