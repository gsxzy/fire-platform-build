import PageTemplate from '@/sections/PageTemplate';
import { hazardService } from '@/api/services';
import { AlertTriangle } from 'lucide-react';
import type { ApiService } from '@/hooks/useApiResource';
import type { ApiResponse, QueryParams, Hazard } from '@/types/db';

/* ===== Maps ===== */
const levelMap: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  normal: '中',
  low: '低',
};

const levelColorMap: Record<string, string> = {
  urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  normal: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const statusMap: Record<string, string> = {
  pending: '待整改',
  rectifying: '整改中',
  completed: '已完成',
  closed: '已关闭',
};

const statusColorMap: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  rectifying: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  closed: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

/* ===== Columns ===== */
const COLUMNS = [
  { key: 'id', label: '隐患编号', width: '120px' },
  { key: 'description', label: '隐患描述', width: '220px' },
  { key: 'unitName', label: '所属单位', width: '160px' },
  { key: 'level', label: '隐患等级', width: '90px', render: (v: unknown) => {
    const s = String(v);
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${levelColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20'}`}>
        {levelMap[s] || s}
      </span>
    );
  }},
  { key: 'foundDate', label: '发现日期', width: '110px' },
  { key: 'deadline', label: '整改期限', width: '110px' },
  { key: 'handler', label: '整改责任人', width: '100px' },
  { key: 'status', label: '状态', width: '100px', render: (v: unknown) => {
    const s = String(v);
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20'}`}>
        {statusMap[s] || s}
      </span>
    );
  }},
];

/* ===== Form Fields ===== */
const FIELDS = [
  { key: 'id', label: '隐患编号', type: 'text' as const, required: true },
  { key: 'unitName', label: '所属单位', type: 'text' as const, required: true },
  { key: 'description', label: '隐患描述', type: 'textarea' as const, required: true },
  { key: 'level', label: '隐患等级', type: 'select' as const, options: [
    { label: '紧急', value: 'urgent' },
    { label: '高', value: 'high' },
    { label: '中', value: 'normal' },
    { label: '低', value: 'low' },
  ]},
  { key: 'foundDate', label: '发现日期', type: 'date' as const },
  { key: 'deadline', label: '整改期限', type: 'date' as const },
  { key: 'handler', label: '整改责任人', type: 'text' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { label: '待整改', value: 'pending' },
    { label: '整改中', value: 'rectifying' },
    { label: '已完成', value: 'completed' },
    { label: '已关闭', value: 'closed' },
  ]},
];

/* ===== Filter Fields ===== */
const FILTER_FIELDS = [
  {
    key: 'level',
    label: '隐患等级',
    options: [
      { label: '紧急', value: 'urgent' },
      { label: '高', value: 'high' },
      { label: '中', value: 'normal' },
      { label: '低', value: 'low' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '待整改', value: 'pending' },
      { label: '整改中', value: 'rectifying' },
      { label: '已完成', value: 'completed' },
      { label: '已关闭', value: 'closed' },
    ],
  },
];

/* ===== Service Wrapper ===== */
const hazardApiService: ApiService<Record<string, unknown>> = {
  list: async (params: QueryParams) => {
    const res = await hazardService.list(params);
    return {
      code: res.code,
      message: res.message,
      data: {
        list: (res.data?.list ?? []) as unknown as Record<string, unknown>[],
        total: res.data?.total ?? 0,
        page: res.data?.page ?? params.page ?? 1,
        pageSize: res.data?.pageSize ?? params.pageSize ?? 10,
        totalPages: res.data?.totalPages ?? 0,
      },
      timestamp: res.timestamp ?? Date.now(),
    };
  },
  create: async (data: unknown) => {
    const res = await hazardService.create(data as Omit<Hazard, 'id'>);
    return res as ApiResponse<unknown>;
  },
  update: async (id: string, data: unknown) => {
    const res = await hazardService.update(id, data as Partial<Hazard>);
    return res as ApiResponse<unknown>;
  },
  delete: async (id: string) => {
    const res = await hazardService.delete(id);
    return res as ApiResponse<unknown>;
  },
};

export default function HazardPage() {
  return (
    <PageTemplate
      title="隐患管理"
      icon={AlertTriangle}
      columns={COLUMNS}
      service={hazardApiService}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      addable
      actions
      batchable
      emptyDescription="隐患登记、整改期限与闭环状态统一在此管理。无数据时请通过巡检或检查入口创建隐患单。"
    />
  );
}
