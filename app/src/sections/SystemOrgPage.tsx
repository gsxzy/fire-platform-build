import PageTemplate from '@/sections/PageTemplate';
import { departmentService } from '@/api/services';
import type { QueryParams } from '@/types/db';
import { Building2 } from 'lucide-react';

const statusMap: Record<string, string> = {
  '1': '正常',
  '0': '停用',
  正常: '正常',
  停用: '停用',
};

const statusColorMap: Record<string, string> = {
  '1': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  '0': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  正常: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  停用: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const COLUMNS = [
  { key: 'name', label: '部门名称', width: '180px' },
  { key: 'code', label: '部门编码', width: '120px' },
  { key: 'parentName', label: '上级部门', width: '150px' },
  { key: 'manager', label: '负责人', width: '100px' },
  { key: 'phone', label: '联系电话', width: '120px' },
  { key: 'sort', label: '排序', width: '70px' },
  {
    key: 'status',
    label: '状态',
    width: '80px',
    render: (v: unknown) => {
      const status = v == null ? '' : String(v);
      const label = statusMap[status] || status;
      const style = statusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];

const FIELDS = [
  { key: 'name', label: '部门名称', type: 'text' as const, required: true },
  { key: 'code', label: '部门编码', type: 'text' as const, required: true },
  { key: 'parentName', label: '上级部门', type: 'text' as const },
  { key: 'manager', label: '负责人', type: 'text' as const },
  { key: 'phone', label: '联系电话', type: 'text' as const },
  { key: 'sort', label: '排序', type: 'number' as const },
  {
    key: 'status',
    label: '状态',
    type: 'select' as const,
    options: [
      { label: '正常', value: '正常' },
      { label: '停用', value: '停用' },
    ],
  },
];

const FILTER_FIELDS = [
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '正常', value: '正常' },
      { label: '停用', value: '停用' },
    ],
  },
];

const normalizeDept = (data: any) => ({
  ...data,
  status: data.status === '正常' ? 1 : 0,
  sort: Number(data.sort) || 0,
  leader: data.manager || data.leader || null,
  phone: data.phone || null,
  parent_name: data.parentName || data.parent || null,
});

const deptService = {
  list: async (params: QueryParams = {}) => {
    const envelope = await departmentService.list();
    const data = Array.isArray(envelope.data) ? envelope.data : [];
    const list = data.map((item: any) => ({
      ...item,
      manager: item.leader || item.manager || '',
      parentName: item.parent_name || item.parentName || item.parent || '',
      status: item.status === 1 || item.status === '1' || item.status === '正常' ? '正常' : '停用',
      sort: item.sort || 0,
    }));
    return {
      code: 200,
      data: { list, total: list.length, page: params?.page || 1, pageSize: params?.pageSize || 10 },
    } as any;
  },
  create: async (data: any) => {
    await departmentService.create(normalizeDept(data));
    return { code: 200, data: null };
  },
  update: async (id: string, data: any) => {
    await departmentService.update(Number(id), normalizeDept(data));
    return { code: 200, data: null };
  },
  delete: async (id: string) => {
    await departmentService.delete(Number(id));
    return { code: 200, data: null };
  },
};

export default function SystemOrgPage() {
  return (
    <PageTemplate
      title="组织架构"
      icon={Building2}
      badge="树形"
      columns={COLUMNS}
      service={deptService}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      emptyDescription="部门树用于用户归属与数据范围。无数据时请确认组织接口可用，或通过「新增」维护科室/班组。"
      permission={{
        create: 'system:view',
        update: 'system:view',
        delete: 'system:view',
      }}
    />
  );
}
