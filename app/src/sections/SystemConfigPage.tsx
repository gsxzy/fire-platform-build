import PageTemplate from '@/sections/PageTemplate';
import { legacyApi, api as httpApi } from '@/api/services';
import type { QueryParams } from '@/types/db';
import { Settings } from 'lucide-react';

const COLUMNS = [
  { key: 'key', label: '配置项', width: '180px' },
  { key: 'value', label: '当前值', width: '220px' },
  { key: 'desc', label: '说明', width: '300px' },
];

const FIELDS = [
  { key: 'key', label: '配置项', type: 'text' as const, required: true },
  { key: 'value', label: '当前值', type: 'text' as const, required: true },
  { key: 'desc', label: '说明', type: 'textarea' as const },
];

const normalizeConfig = (data: any) => ({
  module: data.key || 'system-config',
  action: data.value || '',
  message: data.desc || '',
  level: 'info',
});

const configService = {
  list: async (params: QueryParams = {}) => {
    const res = await legacyApi.configList() as any;
    const data = Array.isArray(res.data) ? res.data : (res.data?.list || []);
    return { code: 200, data: { list: data, total: data.length, page: params?.page || 1, pageSize: params?.pageSize || 10 } } as any;
  },
  create: (data: any) => httpApi.post('/system/config', normalizeConfig(data)),
  update: (id: string, data: any) => httpApi.put(`/system/config/${id}`, normalizeConfig(data)),
  delete: (id: string) => httpApi.delete(`/system/config/${id}`),
};

export default function SystemConfigPage() {
  return <PageTemplate title="系统配置" icon={Settings} badge="14项" columns={COLUMNS} service={configService} fields={FIELDS} />;
}
