import PageTemplate from '@/sections/PageTemplate';
import { legacyApi, api as httpApi } from '@/api/services';
import { Settings } from 'lucide-react';
import type { QueryParams } from '@/types/db';

const COLUMNS = [
  { key: 'id', label: '配置编号', width: '110px' },
  { key: 'name', label: '配置名称', width: '180px' },
  { key: 'type', label: '告警类型', width: '100px' },
  { key: 'level', label: '告警等级', width: '90px' },
  { key: 'notify', label: '通知方式', width: '120px' },
  { key: 'handler', label: '处理人', width: '100px' },
  { key: 'auto', label: '自动处理', width: '80px' },
  { key: 'status', label: '状态', width: '70px' },
];

const FIELDS = [
  { key: 'name', label: '配置名称', type: 'text' as const, required: true },
  { key: 'type', label: '告警类型', type: 'select' as const, required: true, options: ['火警', '故障', '监管', '预警'] },
  { key: 'level', label: '告警等级', type: 'select' as const, required: true, options: ['紧急', '重要', '一般', '普通'] },
  { key: 'notify', label: '通知方式', type: 'select' as const, options: ['声光+App+短信', 'App推送', '系统记录', '声光+App+短信+119', '短信'] },
  { key: 'handler', label: '处理人', type: 'select' as const, options: ['值班人员', '维保人员', '运维人员', '系统', '管理人员'] },
  { key: 'auto', label: '自动处理', type: 'select' as const, options: ['是', '否'] },
  { key: 'status', label: '状态', type: 'select' as const, options: ['启用', '停用'] },
];

const normalizeAlarmConfig = (data: any) => ({
  module: data.name || 'alarm-config',
  action: data.type || '',
  message: JSON.stringify({ level: data.level, notify: data.notify, handler: data.handler, auto: data.auto, status: data.status }),
  level: 'info',
});

const configService = {
  list: async (params: QueryParams = {}) => {
    const res = await legacyApi.configList() as any;
    const data = Array.isArray(res.data) ? res.data : (res.data?.list || []);
    return { code: 200, data: { list: data, total: data.length, page: params?.page || 1, pageSize: params?.pageSize || 10 } } as any;
  },
  create: (data: any) => httpApi.post('/system/config', normalizeAlarmConfig(data)),
  update: (id: string, data: any) => httpApi.put(`/system/config/${id}`, normalizeAlarmConfig(data)),
  delete: (id: string) => httpApi.delete(`/system/config/${id}`),
};

export default function AlarmConfigPage() {
  return <PageTemplate title="告警配置" icon={Settings} badge="6条" columns={COLUMNS} service={configService} fields={FIELDS} />;
}
