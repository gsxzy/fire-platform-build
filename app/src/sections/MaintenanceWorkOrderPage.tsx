import PageTemplate from '@/sections/PageTemplate';
import { workOrderService } from '@/api/services';
import { Ticket } from 'lucide-react';
import type { ApiService } from '@/hooks/useApiResource';
import type { ApiResponse, QueryParams, WorkOrder } from '@/types/db';

/* ===== Maps ===== */
const typeMap: Record<string, string> = {
  inspection: '定期巡检',
  repair: '故障维修',
  maintenance: '保养清洁',
  replacement: '部件更换',
};

const typeColorMap: Record<string, string> = {
  inspection: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  repair: 'text-red-400 bg-red-500/10 border-red-500/20',
  maintenance: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  replacement: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const statusMap: Record<string, string> = {
  pending: '待处理',
  processing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusColorMap: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  processing: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

/* ===== Columns ===== */
const COLUMNS = [
  { key: 'id', label: '工单编号', width: '120px' },
  { key: 'type', label: '工单类型', width: '100px', render: (v: unknown) => {
    const s = String(v);
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20'}`}>
        {typeMap[s] || s}
      </span>
    );
  }},
  { key: 'deviceName', label: '设备名称', width: '150px' },
  { key: 'unitName', label: '报修单位', width: '160px' },
  { key: 'title', label: '故障描述', width: '180px', render: (v: unknown, row: Record<string, unknown>) => (
    <span className="text-slate-300 truncate">{String(v || row.content || '-')}</span>
  )},
  { key: 'staff', label: '指派人员', width: '100px' },
  { key: 'planDate', label: '计划日期', width: '110px' },
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
  { key: 'id', label: '工单编号', type: 'text' as const, required: true },
  { key: 'type', label: '工单类型', type: 'select' as const, options: [
    { label: '定期巡检', value: 'inspection' },
    { label: '故障维修', value: 'repair' },
    { label: '保养清洁', value: 'maintenance' },
    { label: '部件更换', value: 'replacement' },
  ]},
  { key: 'deviceName', label: '设备名称', type: 'text' as const },
  { key: 'unitName', label: '报修单位', type: 'text' as const, required: true },
  { key: 'title', label: '工单标题', type: 'text' as const, required: true },
  { key: 'content', label: '故障描述', type: 'textarea' as const },
  { key: 'staff', label: '指派人员', type: 'text' as const },
  { key: 'planDate', label: '计划日期', type: 'date' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { label: '待处理', value: 'pending' },
    { label: '进行中', value: 'processing' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' },
  ]},
];

/* ===== Filter Fields ===== */
const FILTER_FIELDS = [
  {
    key: 'type',
    label: '工单类型',
    options: [
      { label: '定期巡检', value: 'inspection' },
      { label: '故障维修', value: 'repair' },
      { label: '保养清洁', value: 'maintenance' },
      { label: '部件更换', value: 'replacement' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '待处理', value: 'pending' },
      { label: '进行中', value: 'processing' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' },
    ],
  },
];

/* ===== Service Wrapper ===== */
const orderService: ApiService<Record<string, unknown>> = {
  list: async (params: QueryParams) => {
    const res = await workOrderService.list(params);
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
    const res = await workOrderService.create(data as Omit<WorkOrder, 'id'>);
    return res as ApiResponse<unknown>;
  },
  update: async (id: string, data: unknown) => {
    const res = await workOrderService.update(id, data as Partial<WorkOrder>);
    return res as ApiResponse<unknown>;
  },
  delete: async (id: string) => {
    const res = await workOrderService.delete(id);
    return res as ApiResponse<unknown>;
  },
};

export default function MaintenanceWorkOrderPage() {
  return (
    <PageTemplate
      title="维保工单"
      icon={Ticket}
      columns={COLUMNS}
      service={orderService}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      addable
      actions
      batchable
      emptyTitle="暂无维保工单"
      emptyDescription="请从维保合同或设备维保入口生成工单，完成派工、到场与验收闭环。"
    />
  );
}
