import PageTemplate from '@/sections/PageTemplate';
import { inspectionService } from '@/api/services';
import { ClipboardCheck } from 'lucide-react';

const resultMap: Record<string, string> = {
  pass: '合格',
  fail: '不合格',
  partial: '部分合格',
};

const resultColorMap: Record<string, string> = {
  pass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  fail: 'text-red-400 bg-red-500/10 border-red-500/20',
  partial: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const statusMap: Record<string, string> = {
  'no-need': '无需整改',
  pending: '待整改',
  rectifying: '整改中',
  completed: '已完成',
};

const statusColorMap: Record<string, string> = {
  'no-need': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  pending: 'text-red-400 bg-red-500/10 border-red-500/20',
  rectifying: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  completed: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const COLUMNS = [
  { key: 'id', label: '检查编号', width: '120px' },
  { key: 'name', label: '检查项目', width: '150px' },
  { key: 'unitName', label: '检查单位', width: '150px' },
  { key: 'checker', label: '检查人员', width: '100px' },
  { key: 'date', label: '检查日期', width: '110px' },
  { key: 'totalItems', label: '检查项', width: '70px' },
  { key: 'passedItems', label: '合格项', width: '70px' },
  { key: 'failedItems', label: '不合格项', width: '80px' },
  {
    key: 'result',
    label: '结果',
    width: '80px',
    render: (v: unknown) => {
      const result = String(v);
      const label = resultMap[result] || result;
      const style = resultColorMap[result] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  {
    key: 'status',
    label: '整改状态',
    width: '90px',
    render: (v: unknown) => {
      const status = String(v);
      const label = statusMap[status] || status;
      const style = statusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];

const FIELDS = [
  { key: 'id', label: '检查编号', type: 'text' as const, required: true },
  { key: 'name', label: '检查项目', type: 'text' as const, required: true },
  { key: 'unitName', label: '检查单位', type: 'text' as const, required: true },
  { key: 'checker', label: '检查人员', type: 'text' as const },
  { key: 'date', label: '检查日期', type: 'date' as const },
  { key: 'totalItems', label: '检查项数', type: 'number' as const },
  { key: 'passedItems', label: '合格项数', type: 'number' as const },
  { key: 'failedItems', label: '不合格项数', type: 'number' as const },
  {
    key: 'result',
    label: '结果',
    type: 'select' as const,
    options: [
      { label: '合格', value: 'pass' },
      { label: '不合格', value: 'fail' },
      { label: '部分合格', value: 'partial' },
    ],
  },
  {
    key: 'status',
    label: '整改状态',
    type: 'select' as const,
    options: [
      { label: '无需整改', value: 'no-need' },
      { label: '待整改', value: 'pending' },
      { label: '整改中', value: 'rectifying' },
      { label: '已完成', value: 'completed' },
    ],
  },
];

const FILTER_FIELDS = [
  {
    key: 'result',
    label: '结果',
    options: [
      { label: '合格', value: 'pass' },
      { label: '不合格', value: 'fail' },
      { label: '部分合格', value: 'partial' },
    ],
  },
  {
    key: 'status',
    label: '整改状态',
    options: [
      { label: '无需整改', value: 'no-need' },
      { label: '待整改', value: 'pending' },
      { label: '整改中', value: 'rectifying' },
      { label: '已完成', value: 'completed' },
    ],
  },
];

export default function FireCheckPage() {
  return (
    <PageTemplate
      title="消防检查"
      icon={ClipboardCheck}
      columns={COLUMNS}
      service={inspectionService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      emptyDescription="防火检查项与整改单在此跟踪。无记录时请发起检查任务并完成移动端/现场填报。"
    />
  );
}
