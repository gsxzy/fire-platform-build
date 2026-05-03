import PageTemplate from '@/sections/PageTemplate';
import { legacyApi } from '@/api/services';
import type { QueryParams } from '@/types/db';
import { Building2 } from 'lucide-react';

const COLUMNS = [
  { key: 'name', label: '部门名称', width: '180px' },
  { key: 'code', label: '部门编码', width: '120px' },
  { key: 'parent', label: '上级部门', width: '150px' },
  { key: 'manager', label: '负责人', width: '100px' },
  { key: 'phone', label: '联系电话', width: '120px' },
  { key: 'staffCount', label: '部门人数', width: '90px' },
  { key: 'unitCount', label: '下属单位', width: '90px' },
  { key: 'status', label: '状态', width: '80px' },
];

const FIELDS = [
  { key: 'name', label: '部门名称', type: 'text' as const, required: true },
  { key: 'code', label: '部门编码', type: 'text' as const, required: true },
  { key: 'parent', label: '上级部门', type: 'text' as const },
  { key: 'manager', label: '负责人', type: 'text' as const },
  { key: 'phone', label: '联系电话', type: 'text' as const },
  { key: 'staffCount', label: '部门人数', type: 'number' as const },
  { key: 'unitCount', label: '下属单位', type: 'number' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['正常', '停用'] },
];

const normalizeDept = (data: any) => ({
  ...data,
  status: data.status === '正常' ? 1 : 0,
  staff_count: Number(data.staffCount) || 0,
  unit_count: Number(data.unitCount) || 0,
  leader: data.manager || data.leader || null,
  phone: data.phone || null,
  parent_id: data.parent || null,
});

const deptService = {
  list: async (params: QueryParams = {}) => {
    const res = await legacyApi.deptList() as any;
    const data = Array.isArray(res.data) ? res.data : (res.data?.list || []);
    return { code: 200, data: { list: data, total: data.length, page: params?.page || 1, pageSize: params?.pageSize || 10 } } as any;
  },
  create: (data: any) => legacyApi.createDept(normalizeDept(data)),
  update: (id: string, data: any) => legacyApi.updateDept(Number(id), normalizeDept(data)),
  delete: (id: string) => legacyApi.deleteDept(Number(id)),
};

export default function SystemOrgPage() {
  return <PageTemplate title="组织架构" icon={Building2} badge="7个" columns={COLUMNS} service={deptService} fields={FIELDS} />;
}
