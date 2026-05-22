import PageTemplate from '@/sections/PageTemplate';
import { patrolPlanService } from '@/api/services';
import { ClipboardList } from 'lucide-react';
import type { ApiService } from '@/hooks/useApiResource';
import type { ApiResponse, QueryParams, PatrolPlan } from '@/types/db';

/* ===== Maps ===== */
const cycleMap: Record<string, string> = {
  daily: '日检',
  weekly: '周检',
  monthly: '月检',
  quarterly: '季检',
};

const cycleColorMap: Record<string, string> = {
  daily: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  weekly: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  monthly: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  quarterly: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const statusMap: Record<string, string> = {
  normal: '正常',
  fault: '故障',
  maintenance: '维护中',
  offline: '离线',
  disabled: '停用',
};

const statusColorMap: Record<string, string> = {
  normal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  fault: 'text-red-400 bg-red-500/10 border-red-500/20',
  maintenance: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  offline: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  disabled: 'text-slate-500 bg-slate-600/10 border-slate-600/20',
};

/* ===== Columns ===== */
const COLUMNS = [
  { key: 'id', label: '计划编号', width: '120px' },
  { key: 'name', label: '计划名称', width: '180px' },
  { key: 'unitName', label: '负责单位', width: '160px' },
  { key: 'cycle', label: '巡检周期', width: '100px', render: (v: unknown) => {
    const s = v == null ? '' : String(v);
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cycleColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20'}`}>
        {cycleMap[s] || s || '-'}
      </span>
    );
  }},
  { key: 'items', label: '巡检项数', width: '90px' },
  { key: 'nextDate', label: '下次巡检', width: '110px' },
  { key: 'staff', label: '责任人', width: '100px' },
  { key: 'status', label: '状态', width: '90px', render: (v: unknown) => {
    const s = v == null ? '' : String(v);
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20'}`}>
        {statusMap[s] || s || '-'}
      </span>
    );
  }},
];

/* ===== Form Fields ===== */
const FIELDS = [
  { key: 'id', label: '计划编号', type: 'text' as const, required: true },
  { key: 'name', label: '计划名称', type: 'text' as const, required: true },
  { key: 'unitName', label: '负责单位', type: 'text' as const, required: true },
  { key: 'cycle', label: '巡检周期', type: 'select' as const, options: [
    { label: '日检', value: 'daily' },
    { label: '周检', value: 'weekly' },
    { label: '月检', value: 'monthly' },
    { label: '季检', value: 'quarterly' },
  ]},
  { key: 'items', label: '巡检项数', type: 'number' as const },
  { key: 'nextDate', label: '下次巡检', type: 'date' as const },
  { key: 'staff', label: '责任人', type: 'text' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { label: '正常', value: 'normal' },
    { label: '故障', value: 'fault' },
    { label: '维护中', value: 'maintenance' },
    { label: '离线', value: 'offline' },
    { label: '停用', value: 'disabled' },
  ]},
];

/* ===== Filter Fields ===== */
const FILTER_FIELDS = [
  {
    key: 'cycle',
    label: '巡检周期',
    options: [
      { label: '日检', value: 'daily' },
      { label: '周检', value: 'weekly' },
      { label: '月检', value: 'monthly' },
      { label: '季检', value: 'quarterly' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '正常', value: 'normal' },
      { label: '故障', value: 'fault' },
      { label: '维护中', value: 'maintenance' },
      { label: '离线', value: 'offline' },
      { label: '停用', value: 'disabled' },
    ],
  },
];

/* ===== Service Wrapper ===== */
const planService: ApiService<Record<string, unknown>> = {
  list: async (params: QueryParams) => {
    const res = await patrolPlanService.list(params);
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
    const res = await patrolPlanService.create(data as Omit<PatrolPlan, 'id'>);
    return res as ApiResponse<unknown>;
  },
  update: async (id: string, data: unknown) => {
    const res = await patrolPlanService.update(id, data as Partial<PatrolPlan>);
    return res as ApiResponse<unknown>;
  },
  delete: async (id: string) => {
    const res = await patrolPlanService.delete(id);
    return res as ApiResponse<unknown>;
  },
};

export default function PatrolPlanPage() {
  return (
    <PageTemplate
      title="巡检计划"
      icon={ClipboardList}
      columns={COLUMNS}
      service={planService}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      addable
      actions
      batchable
      permission={{ create: 'patrol:manage', update: 'patrol:manage', delete: 'patrol:manage' }}
      emptyTitle="暂无巡检计划"
      emptyDescription="请先配置巡检路线与周期，执行层将按计划自动生成任务。"
    />
  );
}
