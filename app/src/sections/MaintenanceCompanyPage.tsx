import PageTemplate from '@/sections/PageTemplate';
import { legacyApi } from '@/api/services';
import type { QueryParams } from '@/types/db';
import { Building2 } from 'lucide-react';

const COLUMNS = [
  { key: 'name', label: '公司名称', width: '180px' },
  { key: 'license', label: '资质证书', width: '150px' },
  { key: 'level', label: '资质等级', width: '100px' },
  { key: 'contact', label: '联系人', width: '100px' },
  { key: 'phone', label: '联系电话', width: '120px' },
  { key: 'serviceCount', label: '服务单位数', width: '90px' },
  { key: 'staffCount', label: '技术人员', width: '90px' },
  { key: 'status', label: '状态', width: '80px' },
];

const FIELDS = [
  { key: 'name', label: '公司名称', type: 'text' as const, required: true },
  { key: 'license', label: '资质证书', type: 'text' as const },
  { key: 'level', label: '资质等级', type: 'select' as const, options: ['一级', '二级', '三级'] },
  { key: 'contact', label: '联系人', type: 'text' as const },
  { key: 'phone', label: '联系电话', type: 'text' as const },
  { key: 'serviceCount', label: '服务单位数', type: 'number' as const },
  { key: 'staffCount', label: '技术人员', type: 'number' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['正常', '暂停', '注销'] },
];

const normalizeCompany = (data: any) => ({
  name: data.name,
  code: data.license || '',
  leader: data.contact || '',
  phone: data.phone || '',
  staff_count: Number(data.staffCount) || 0,
  unit_count: Number(data.serviceCount) || 0,
  status: data.status === '正常' ? 1 : data.status === '暂停' ? 2 : 0,
});

const maintCompanyService = {
  list: async (params: QueryParams = {}) => {
    const res = await legacyApi.maintCompanyList() as any;
    const data = Array.isArray(res.data) ? res.data : (res.data?.list || []);
    return { code: 200, data: { list: data, total: data.length, page: params?.page || 1, pageSize: params?.pageSize || 10 } } as any;
  },
  create: (data: any) => legacyApi.createMaintCompany(normalizeCompany(data)),
  update: (id: string, data: any) => legacyApi.updateMaintCompany(Number(id), normalizeCompany(data)),
  delete: (id: string) => legacyApi.deleteMaintCompany(Number(id)),
};

export default function MaintenanceCompanyPage() {
  return <PageTemplate title="维保单位管理" icon={Building2} badge="5家" columns={COLUMNS} service={maintCompanyService} fields={FIELDS} />;
}
