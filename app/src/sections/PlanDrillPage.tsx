import PageTemplate from '@/sections/PageTemplate';
import { drillService } from '@/api/services';
import { Dumbbell } from 'lucide-react';

const resultMap: Record<string, string> = {
  excellent: '优秀',
  good: '良好',
  pass: '合格',
  fail: '不合格',
};

const resultColorMap: Record<string, string> = {
  excellent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  good: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  pass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  fail: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const statusMap: Record<string, string> = {
  planned: '计划中',
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusColorMap: Record<string, string> = {
  planned: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  ongoing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const COLUMNS = [
  { key: 'id', label: '演练编号', width: '120px' },
  { key: 'name', label: '演练名称', width: '150px' },
  { key: 'planId', label: '关联预案', width: '120px' },
  { key: 'unitName', label: '演练单位', width: '150px' },
  { key: 'date', label: '演练时间', width: '110px' },
  { key: 'location', label: '演练地点', width: '130px' },
  { key: 'participants', label: '参与人数', width: '80px' },
  { key: 'duration', label: '耗时', width: '70px' },
  {
    key: 'result',
    label: '演练效果',
    width: '90px',
    render: (v: unknown) => {
      const result = String(v);
      const label = resultMap[result] || result;
      const style = resultColorMap[result] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  {
    key: 'status',
    label: '状态',
    width: '80px',
    render: (v: unknown) => {
      const status = String(v);
      const label = statusMap[status] || status;
      const style = statusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];

const FIELDS = [
  { key: 'id', label: '演练编号', type: 'text' as const, required: true },
  { key: 'name', label: '演练名称', type: 'text' as const, required: true },
  { key: 'planId', label: '关联预案', type: 'text' as const },
  { key: 'unitName', label: '演练单位', type: 'text' as const, required: true },
  { key: 'date', label: '演练时间', type: 'date' as const },
  { key: 'location', label: '演练地点', type: 'text' as const },
  { key: 'participants', label: '参与人数', type: 'number' as const },
  { key: 'duration', label: '耗时', type: 'text' as const },
  {
    key: 'result',
    label: '演练效果',
    type: 'select' as const,
    options: [
      { label: '优秀', value: 'excellent' },
      { label: '良好', value: 'good' },
      { label: '合格', value: 'pass' },
      { label: '不合格', value: 'fail' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select' as const,
    options: [
      { label: '计划中', value: 'planned' },
      { label: '进行中', value: 'ongoing' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' },
    ],
  },
];

const FILTER_FIELDS = [
  {
    key: 'result',
    label: '演练效果',
    options: [
      { label: '优秀', value: 'excellent' },
      { label: '良好', value: 'good' },
      { label: '合格', value: 'pass' },
      { label: '不合格', value: 'fail' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '计划中', value: 'planned' },
      { label: '进行中', value: 'ongoing' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' },
    ],
  },
];

export default function PlanDrillPage() {
  return (
    <PageTemplate
      title="演练记录"
      icon={Dumbbell}
      columns={COLUMNS}
      service={drillService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      emptyDescription="演练计划执行后在此归档总结。列表为空时请先在预案模块制定计划并完成现场录入。"
    />
  );
}
