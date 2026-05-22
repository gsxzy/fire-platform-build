import PageTemplate from '@/sections/PageTemplate';
import { api as httpApi } from '@/api/client';
import type { ApiService } from '@/hooks/useApiResource';
import type { ApiResponse, QueryParams } from '@/types/db';
import { Building2 } from 'lucide-react';

/* ===== Types ===== */
interface MaintenanceCompany {
  id: string;
  name: string;
  code?: string;
  license?: string;
  contact?: string;
  phone?: string;
  level?: string;
  status?: string;
  serviceCount?: number;
  staffCount?: number;
}

/* ===== Maps ===== */
const statusMap: Record<string, string> = {
  '正常': '正常',
  '暂停': '暂停',
  '注销': '注销',
  active: '正常',
  suspended: '暂停',
  cancelled: '注销',
  '1': '正常',
  '2': '暂停',
  '0': '注销',
};

const statusColorMap: Record<string, string> = {
  '正常': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  '暂停': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  '注销': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  suspended: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  cancelled: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  '1': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  '2': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  '0': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const levelMap: Record<string, string> = {
  '一级': '一级',
  '二级': '二级',
  '三级': '三级',
};

const levelColorMap: Record<string, string> = {
  '一级': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  '二级': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  '三级': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

/* ===== Columns ===== */
const COLUMNS = [
  { key: 'name', label: '单位名称', width: '180px' },
  { key: 'code', label: '统一社会信用代码', width: '160px', render: (v: unknown, row: Record<string, unknown>) => (
    <span className="font-mono text-slate-300">{String(v || row.license || '-')}</span>
  )},
  { key: 'contact', label: '联系人', width: '100px' },
  { key: 'phone', label: '联系电话', width: '120px' },
  { key: 'level', label: '资质等级', width: '100px', render: (v: unknown) => {
    const s = v == null ? '' : String(v);
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${levelColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20'}`}>
        {levelMap[s] || s || '-'}
      </span>
    );
  }},
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
  { key: 'name', label: '单位名称', type: 'text' as const, required: true },
  { key: 'code', label: '统一社会信用代码', type: 'text' as const },
  { key: 'contact', label: '联系人', type: 'text' as const },
  { key: 'phone', label: '联系电话', type: 'text' as const },
  { key: 'level', label: '资质等级', type: 'select' as const, options: [
    { label: '一级', value: '一级' },
    { label: '二级', value: '二级' },
    { label: '三级', value: '三级' },
  ]},
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { label: '正常', value: '正常' },
    { label: '暂停', value: '暂停' },
    { label: '注销', value: '注销' },
  ]},
];

/* ===== Filter Fields ===== */
const FILTER_FIELDS = [
  {
    key: 'level',
    label: '资质等级',
    options: [
      { label: '一级', value: '一级' },
      { label: '二级', value: '二级' },
      { label: '三级', value: '三级' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '正常', value: '正常' },
      { label: '暂停', value: '暂停' },
      { label: '注销', value: '注销' },
    ],
  },
];

/* ===== Service Wrapper ===== */
const companyService: ApiService<Record<string, unknown>> = {
  list: async (params: QueryParams) => {
    const res = await httpApi.get<MaintenanceCompany[] | { list: MaintenanceCompany[]; total?: number }>('/maintenance/companies', params);
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
    const res = await httpApi.post<null>('/maintenance/companies', data);
    return res as ApiResponse<unknown>;
  },
  update: async (id: string, data: unknown) => {
    const res = await httpApi.put<null>(`/maintenance/companies/${id}`, data);
    return res as ApiResponse<unknown>;
  },
  delete: async (id: string) => {
    const res = await httpApi.delete<null>(`/maintenance/companies/${id}`);
    return res as ApiResponse<unknown>;
  },
};

export default function MaintenanceCompanyPage() {
  return (
    <PageTemplate
      title="维保单位管理"
      icon={Building2}
      columns={COLUMNS}
      service={companyService}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      addable
      actions
      batchable
      emptyDescription="维保服务企业名录用于合同与工单关联。列表为空时请录入具备资质的服务商信息。"
    />
  );
}
