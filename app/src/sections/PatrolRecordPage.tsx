import PageTemplate from '@/sections/PageTemplate';
import { patrolRecordService } from '@/api/services';
import { ClipboardCheck } from 'lucide-react';
import type { ApiService } from '@/hooks/useApiResource';
import type { ApiResponse, QueryParams, PatrolRecord } from '@/types/db';

/* ===== Maps ===== */
const statusMap: Record<string, string> = {
  'all-normal': '正常',
  'has-issue': '异常',
};

const statusColorMap: Record<string, string> = {
  'all-normal': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'has-issue': 'text-red-400 bg-red-500/10 border-red-500/20',
};

/* ===== Columns ===== */
const COLUMNS = [
  { key: 'id', label: '记录编号', width: '120px' },
  { key: 'planId', label: '关联计划', width: '120px', render: (v: unknown, _row: Record<string, unknown>) => (
    <span className="font-mono text-slate-300">{String(v || '-')}</span>
  )},
  { key: 'staff', label: '巡检人员', width: '100px' },
  { key: 'date', label: '巡检时间', width: '110px' },
  { key: 'items', label: '巡检项', width: '80px' },
  { key: 'passed', label: '通过数', width: '80px', render: (v: unknown) => (
    <span className="text-emerald-400">{String(v ?? '-')}</span>
  )},
  { key: 'failed', label: '发现隐患数', width: '90px', render: (v: unknown, _row: Record<string, unknown>) => {
    const failed = Number(v ?? 0);
    return (
      <span className={failed > 0 ? 'text-red-400' : 'text-slate-400'}>
        {failed}
      </span>
    );
  }},
  { key: 'status', label: '巡检结果', width: '100px', render: (v: unknown) => {
    const s = v == null ? '' : String(v);
    const label = statusMap[s] || s || '-';
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20'}`}>
        {label}
      </span>
    );
  }},
];

/* ===== Form Fields ===== */
const FIELDS = [
  { key: 'id', label: '记录编号', type: 'text' as const, required: true },
  { key: 'planId', label: '关联计划', type: 'text' as const },
  { key: 'staff', label: '巡检人员', type: 'text' as const },
  { key: 'date', label: '巡检时间', type: 'date' as const },
  { key: 'items', label: '巡检项', type: 'number' as const },
  { key: 'passed', label: '通过数', type: 'number' as const },
  { key: 'failed', label: '异常数', type: 'number' as const },
  { key: 'status', label: '巡检结果', type: 'select' as const, options: [
    { label: '正常', value: 'all-normal' },
    { label: '异常', value: 'has-issue' },
  ]},
];

/* ===== Filter Fields ===== */
const FILTER_FIELDS = [
  {
    key: 'status',
    label: '巡检结果',
    options: [
      { label: '正常', value: 'all-normal' },
      { label: '异常', value: 'has-issue' },
    ],
  },
];

/* ===== Service Wrapper ===== */
const recordService: ApiService<Record<string, unknown>> = {
  list: async (params: QueryParams) => {
    const res = await patrolRecordService.list(params);
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
    const res = await patrolRecordService.create(data as Omit<PatrolRecord, 'id'>);
    return res as ApiResponse<unknown>;
  },
  update: async (id: string, data: unknown) => {
    const res = await patrolRecordService.update(id, data as Partial<PatrolRecord>);
    return res as ApiResponse<unknown>;
  },
  delete: async (id: string) => {
    const res = await patrolRecordService.delete(id);
    return res as ApiResponse<unknown>;
  },
};

export default function PatrolRecordPage() {
  return (
    <PageTemplate
      title="巡检记录"
      icon={ClipboardCheck}
      columns={COLUMNS}
      service={recordService}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      addable
      actions
      batchable
      permission={{ create: 'patrol:manage', update: 'patrol:manage', delete: 'patrol:manage' }}
      emptyDescription="移动端或现场签到产生的巡检记录将同步至此。无数据请检查巡检任务是否已下发并完成。"
    />
  );
}
