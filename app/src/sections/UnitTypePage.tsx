import PageTemplate from '@/sections/PageTemplate';
import { unitService } from '@/api/services';
import { FileBarChart } from 'lucide-react';

const COLUMNS = [
  { key: 'code', label: '类型编码', width: '110px' },
  { key: 'name', label: '类型名称', width: '150px' },
  { key: 'level', label: '消防等级', width: '100px' },
  { key: 'risk', label: '风险等级', width: '90px' },
  { key: 'units', label: '单位数量', width: '90px' },
  { key: 'standard', label: '检查标准', width: '150px' },
  { key: 'period', label: '巡检周期', width: '90px' },
  { key: 'status', label: '状态', width: '70px' },
];

const FIELDS = [
  { key: 'code', label: '类型编码', type: 'text' as const, required: true },
  { key: 'name', label: '类型名称', type: 'text' as const, required: true },
  { key: 'level', label: '消防等级', type: 'select' as const, required: true, options: ['特级', '一级', '二级', '三级'] },
  { key: 'risk', label: '风险等级', type: 'select' as const, options: ['极高', '高', '中', '低'] },
  { key: 'units', label: '单位数量', type: 'number' as const },
  { key: 'standard', label: '检查标准', type: 'text' as const },
  { key: 'period', label: '巡检周期', type: 'select' as const, options: ['每日', '每周', '每月', '每季度'] },
  { key: 'status', label: '状态', type: 'select' as const, options: ['启用', '停用'] },
];

export default function UnitTypePage() {
  return <PageTemplate title="单位类型" icon={FileBarChart} badge="7类" columns={COLUMNS} service={unitService as any} fields={FIELDS} />;
}
