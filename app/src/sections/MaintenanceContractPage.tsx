import PageTemplate from '@/sections/PageTemplate';
import { maintContractService } from '@/api/services';
import { FileSignature } from 'lucide-react';
import type { ApiService } from '@/hooks/useApiResource';
import type { ApiResponse, QueryParams, MaintContract } from '@/types/db';

/* ===== Maps ===== */
const statusMap: Record<string, string> = {
  active: '有效',
  expiring: '即将到期',
  expired: '已过期',
};

const statusColorMap: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  expiring: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  expired: 'text-red-400 bg-red-500/10 border-red-500/20',
};

/* ===== Columns ===== */
const COLUMNS = [
  { key: 'id', label: '合同编号', width: '120px' },
  { key: 'name', label: '合同名称', width: '180px' },
  { key: 'company', label: '维保单位', width: '160px' },
  { key: 'amount', label: '合同金额', width: '110px', render: (v: unknown) => (
    <span className="text-slate-200">{typeof v === 'number' || typeof v === 'string' ? `¥${v}` : '-'}</span>
  )},
  { key: 'startDate', label: '开始日期', width: '110px' },
  { key: 'endDate', label: '结束日期', width: '110px' },
  { key: 'status', label: '状态', width: '100px', render: (v: unknown) => {
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
  { key: 'id', label: '合同编号', type: 'text' as const, required: true },
  { key: 'name', label: '合同名称', type: 'text' as const, required: true },
  { key: 'company', label: '维保单位', type: 'text' as const, required: true },
  { key: 'amount', label: '合同金额', type: 'number' as const },
  { key: 'startDate', label: '开始日期', type: 'date' as const },
  { key: 'endDate', label: '结束日期', type: 'date' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { label: '有效', value: 'active' },
    { label: '即将到期', value: 'expiring' },
    { label: '已过期', value: 'expired' },
  ]},
];

/* ===== Filter Fields ===== */
const FILTER_FIELDS = [
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '有效', value: 'active' },
      { label: '即将到期', value: 'expiring' },
      { label: '已过期', value: 'expired' },
    ],
  },
];

/* ===== Service Wrapper ===== */
const contractService: ApiService<Record<string, unknown>> = {
  list: async (params: QueryParams) => {
    const res = await maintContractService.list(params);
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
    const res = await maintContractService.create(data as Omit<MaintContract, 'id'>);
    return res as ApiResponse<unknown>;
  },
  update: async (id: string, data: unknown) => {
    const res = await maintContractService.update(id, data as Partial<MaintContract>);
    return res as ApiResponse<unknown>;
  },
  delete: async (id: string) => {
    const res = await maintContractService.delete(id);
    return res as ApiResponse<unknown>;
  },
};

export default function MaintenanceContractPage() {
  return (
    <PageTemplate
      title="维保合同"
      icon={FileSignature}
      columns={COLUMNS}
      service={contractService}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      addable
      actions
      batchable
      emptyTitle="暂无维保合同"
      emptyDescription="请先签订并录入合同信息，以便关联维保单位与生成到期提醒。"
    />
  );
}
