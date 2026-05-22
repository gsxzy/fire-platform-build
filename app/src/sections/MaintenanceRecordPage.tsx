import PageTemplate from '@/sections/PageTemplate';
import { api as httpApi } from '@/api/client';
import type { ApiService } from '@/hooks/useApiResource';
import type { ApiResponse, QueryParams } from '@/types/db';
import { Wrench } from 'lucide-react';

/* ===== Types ===== */
interface MaintRecordRow {
  id: string;
  unitName?: string;
  deviceName?: string;
  type?: string;
  content?: string;
  result?: string;
  staff?: string;
  date?: string;
  status?: string;
}

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
  completed: '已完成',
  pending: '待完成',
};

const statusColorMap: Record<string, string> = {
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

/* ===== Columns ===== */
const COLUMNS = [
  { key: 'id', label: '记录编号', width: '120px' },
  { key: 'deviceName', label: '设备名称', width: '150px' },
  { key: 'type', label: '维保类型', width: '100px', render: (v: unknown) => {
    const s = v == null ? '' : String(v);
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20'}`}>
        {typeMap[s] || s || '-'}
      </span>
    );
  }},
  { key: 'content', label: '维保内容', width: '200px' },
  { key: 'staff', label: '维保人员', width: '100px' },
  { key: 'date', label: '维保时间', width: '110px' },
  { key: 'status', label: '状态', width: '90px', render: (_v: unknown, row: Record<string, unknown>) => {
    const result = row.result;
    const s = result ? 'completed' : 'pending';
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20'}`}>
        {statusMap[s] || s || '-'}
      </span>
    );
  }},
];

/* ===== Form Fields ===== */
const FIELDS = [
  { key: 'id', label: '记录编号', type: 'text' as const, required: true },
  { key: 'deviceName', label: '设备名称', type: 'text' as const },
  { key: 'type', label: '维保类型', type: 'select' as const, options: [
    { label: '定期巡检', value: 'inspection' },
    { label: '故障维修', value: 'repair' },
    { label: '保养清洁', value: 'maintenance' },
    { label: '部件更换', value: 'replacement' },
  ]},
  { key: 'content', label: '维保内容', type: 'textarea' as const },
  { key: 'result', label: '维保结果', type: 'textarea' as const },
  { key: 'staff', label: '维保人员', type: 'text' as const },
  { key: 'date', label: '维保时间', type: 'date' as const },
];

/* ===== Filter Fields ===== */
const FILTER_FIELDS = [
  {
    key: 'type',
    label: '维保类型',
    options: [
      { label: '定期巡检', value: 'inspection' },
      { label: '故障维修', value: 'repair' },
      { label: '保养清洁', value: 'maintenance' },
      { label: '部件更换', value: 'replacement' },
    ],
  },
];

/* ===== Service Wrapper ===== */
const recordService: ApiService<Record<string, unknown>> = {
  list: async (params: QueryParams) => {
    const res = await httpApi.get<MaintRecordRow[] | { list: MaintRecordRow[]; total?: number }>('/maintenance/records', params);
    let list: Record<string, unknown>[] = [];
    let total = 0;

    if (Array.isArray(res.data)) {
      list = res.data as unknown as Record<string, unknown>[];
      total = list.length;
    } else if (res.data && typeof res.data === 'object') {
      const obj = res.data as Record<string, unknown>;
      if (Array.isArray(obj.list)) {
        list = obj.list;
        total = Number(obj.total) || list.length;
      }
    }

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    return {
      code: res.code,
      message: res.message,
      data: {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      timestamp: res.timestamp ?? Date.now(),
    };
  },
  create: async (data: unknown) => {
    const res = await httpApi.post<null>('/maintenance/records', data);
    return res as ApiResponse<unknown>;
  },
  update: async (id: string, data: unknown) => {
    const res = await httpApi.put<null>(`/maintenance/records/${id}`, data);
    return res as ApiResponse<unknown>;
  },
  delete: async (id: string) => {
    const res = await httpApi.delete<null>(`/maintenance/records/${id}`);
    return res as ApiResponse<unknown>;
  },
};

export default function MaintenanceRecordPage() {
  return (
    <PageTemplate
      title="维保记录"
      icon={Wrench}
      columns={COLUMNS}
      service={recordService}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      addable
      actions
      batchable
      emptyDescription="到场作业明细与更换部件记录在此查询。无数据请确认现场维保已回填或接口同步正常。"
    />
  );
}
