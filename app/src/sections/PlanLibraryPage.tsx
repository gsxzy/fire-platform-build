import PageTemplate from '@/sections/PageTemplate';
import { planService } from '@/api/services';
import { BookOpen } from 'lucide-react';

const statusMap: Record<string, string> = {
  active: '生效中',
  revoked: '已废止',
  revising: '修订中',
};

const statusColorMap: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  revoked: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  revising: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const COLUMNS = [
  { key: 'id', label: '预案编号', width: '120px' },
  { key: 'name', label: '预案名称', width: '170px' },
  { key: 'type', label: '预案类型', width: '100px' },
  { key: 'unitName', label: '适用单位', width: '150px' },
  { key: 'level', label: '预案级别', width: '90px' },
  { key: 'version', label: '版本号', width: '80px' },
  { key: 'createdAt', label: '编制日期', width: '110px' },
  { key: 'updateDate', label: '修订日期', width: '110px' },
  {
    key: 'status',
    label: '状态',
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
  { key: 'id', label: '预案编号', type: 'text' as const, required: true },
  { key: 'name', label: '预案名称', type: 'text' as const, required: true },
  {
    key: 'type',
    label: '预案类型',
    type: 'select' as const,
    options: [
      { label: '火灾', value: '火灾' },
      { label: '疏散', value: '疏散' },
      { label: '泄漏', value: '泄漏' },
      { label: '防汛', value: '防汛' },
      { label: '地震', value: '地震' },
      { label: '综合', value: '综合' },
    ],
  },
  { key: 'unitName', label: '适用单位', type: 'text' as const, required: true },
  {
    key: 'level',
    label: '预案级别',
    type: 'select' as const,
    options: [
      { label: '一级', value: '一级' },
      { label: '二级', value: '二级' },
      { label: '三级', value: '三级' },
    ],
  },
  { key: 'version', label: '版本号', type: 'text' as const },
  { key: 'createdAt', label: '编制日期', type: 'date' as const },
  { key: 'updateDate', label: '修订日期', type: 'date' as const },
  {
    key: 'status',
    label: '状态',
    type: 'select' as const,
    options: [
      { label: '生效中', value: 'active' },
      { label: '已废止', value: 'revoked' },
      { label: '修订中', value: 'revising' },
    ],
  },
];

const FILTER_FIELDS = [
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '生效中', value: 'active' },
      { label: '已废止', value: 'revoked' },
      { label: '修订中', value: 'revising' },
    ],
  },
  {
    key: 'type',
    label: '预案类型',
    options: [
      { label: '火灾', value: '火灾' },
      { label: '疏散', value: '疏散' },
      { label: '泄漏', value: '泄漏' },
      { label: '防汛', value: '防汛' },
      { label: '地震', value: '地震' },
      { label: '综合', value: '综合' },
    ],
  },
];

export default function PlanLibraryPage() {
  return (
    <PageTemplate
      title="预案库"
      icon={BookOpen}
      columns={COLUMNS}
      service={planService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      emptyTitle="暂无应急预案"
      emptyDescription="请先新增或导入预案文本，供演练与联动规则引用。"
    />
  );
}
