import PageTemplate from '@/sections/PageTemplate';
import { systemConfigService, api as httpApi } from '@/api/services';
import type { QueryParams } from '@/types/db';
import { Settings } from 'lucide-react';

const typeMap: Record<string, string> = {
  system: '系统',
  business: '业务',
};

const typeColorMap: Record<string, string> = {
  system: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  business: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const COLUMNS = [
  { key: 'configKey', label: '参数键', width: '180px' },
  { key: 'configValue', label: '参数值', width: '220px' },
  { key: 'description', label: '参数说明', width: '240px' },
  {
    key: 'configType',
    label: '参数类型',
    width: '90px',
    render: (v: unknown) => {
      const type = String(v);
      const label = typeMap[type] || type || '-';
      const style = typeColorMap[type] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  {
    key: 'status',
    label: '状态',
    width: '80px',
    render: (v: unknown) => {
      const status = String(v);
      const isActive = status === '1' || status === 'active';
      const label = isActive ? '正常' : '停用';
      const style = isActive
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        : 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];

const FIELDS = [
  { key: 'configKey', label: '参数键', type: 'text' as const, required: true },
  { key: 'configValue', label: '参数值', type: 'text' as const, required: true },
  { key: 'description', label: '参数说明', type: 'textarea' as const },
  {
    key: 'configType',
    label: '参数类型',
    type: 'select' as const,
    options: [
      { label: '系统', value: 'system' },
      { label: '业务', value: 'business' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select' as const,
    options: [
      { label: '正常', value: '1' },
      { label: '停用', value: '0' },
    ],
  },
];

const FILTER_FIELDS = [
  {
    key: 'configType',
    label: '参数类型',
    options: [
      { label: '系统', value: 'system' },
      { label: '业务', value: 'business' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '正常', value: '1' },
      { label: '停用', value: '0' },
    ],
  },
];

const normalizeConfig = (data: any) => ({
  configKey: data.configKey || '',
  configValue: data.configValue || '',
  description: data.description || '',
  configType: data.configType || 'system',
  status: data.status === '1' || data.status === 1 || data.status === 'active' ? 1 : 0,
});

const configService = {
  list: async (params: QueryParams = {}) => {
    const res = (await systemConfigService.list()) as any;
    const data = Array.isArray(res.data) ? res.data : res.data?.list || [];
    const list = data.map((item: any) => ({
      id: item.id,
      configKey: item.configKey || item.config_key || item.key || '',
      configValue: item.configValue || item.config_value || item.value || '',
      description: item.description || item.desc || item.remark || '',
      configType: item.configType || item.config_type || 'system',
      status: item.status === 1 || item.status === '1' || item.status === 'active' ? '1' : '0',
    }));
    return {
      code: 200,
      data: { list, total: list.length, page: params?.page || 1, pageSize: params?.pageSize || 10 },
    } as any;
  },
  create: (data: any) => httpApi.post('/system/config', normalizeConfig(data)),
  update: (id: string, data: any) => httpApi.put(`/system/config/${id}`, normalizeConfig(data)),
  delete: (id: string) => httpApi.delete(`/system/config/${id}`),
};

export default function SystemConfigPage() {
  return (
    <PageTemplate
      title="系统配置"
      icon={Settings}
      badge="参数"
      columns={COLUMNS}
      service={configService}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      emptyDescription="平台参数与字典项集中在此维护。若列表为空请确认 system_configs 等表已初始化。"
    />
  );
}
