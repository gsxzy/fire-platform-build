import PageTemplate from '@/sections/PageTemplate';
import { drillService } from '@/api/services';
import { Dumbbell } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '演练编号', width: '120px' },
  { key: 'name', label: '演练名称', width: '180px' },
  { key: 'unitName', label: '演练单位', width: '180px' },
  { key: 'date', label: '演练日期', width: '110px' },
  { key: 'participants', label: '参与人数', width: '90px' },
  { key: 'duration', label: '用时', width: '80px' },
  { key: 'result', label: '结果', width: '100px' },
];

const FIELDS = [
  { key: 'id', label: '演练编号', type: 'text' as const, required: true },
  { key: 'name', label: '演练名称', type: 'text' as const, required: true },
  { key: 'unitName', label: '演练单位', type: 'text' as const, required: true },
  { key: 'date', label: '演练日期', type: 'date' as const },
  { key: 'participants', label: '参与人数', type: 'number' as const },
  { key: 'duration', label: '用时', type: 'text' as const },
  { key: 'result', label: '结果', type: 'select' as const, options: ['excellent', 'good', 'pass', 'fail'] },
];

export default function PlanDrillPage() {
  return <PageTemplate title="演练记录" icon={Dumbbell} columns={COLUMNS} service={drillService as any} fields={FIELDS} />;
}
