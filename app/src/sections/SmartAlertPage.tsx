import PageTemplate from '@/sections/PageTemplate';
import { legacyApi, api as httpApi } from '@/api/services';
import type { QueryParams } from '@/types/db';
import { AlertTriangle } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '预警编号', width: '110px' },
  { key: 'device', label: '设备名称', width: '180px' },
  { key: 'type', label: '预警类型', width: '100px' },
  { key: 'level', label: '预警等级', width: '90px' },
  { key: 'desc', label: '预警描述', width: '220px' },
  { key: 'time', label: '预警时间', width: '140px' },
  { key: 'status', label: '处理状态', width: '90px' },
];

const FIELDS = [
  { key: 'device', label: '设备名称', type: 'text' as const, required: true },
  { key: 'type', label: '预警类型', type: 'select' as const, required: true, options: ['设备老化', '参数异常', '环境风险', '运维逾期'] },
  { key: 'level', label: '预警等级', type: 'select' as const, required: true, options: ['紧急', '重要', '一般', '普通'] },
  { key: 'desc', label: '预警描述', type: 'textarea' as const },
  { key: 'time', label: '预警时间', type: 'text' as const, placeholder: 'YYYY-MM-DD HH:mm:ss' },
  { key: 'status', label: '处理状态', type: 'select' as const, options: ['未处理', '已确认', '已处理'] },
];

const normalizeAlert = (data: any) => ({
  alert_no: data.type || '',
  device_id: data.device || '',
  level: data.level === '紧急' ? 1 : data.level === '重要' ? 2 : data.level === '一般' ? 3 : 4,
  message: [data.desc, data.time].filter(Boolean).join(' | '),
  status: data.status === '已处理' ? 2 : data.status === '已确认' ? 1 : 0,
});

const smartAlertService = {
  list: async (params: QueryParams = {}) => {
    const res = await legacyApi.smartAlertList() as any;
    const data = Array.isArray(res.data) ? res.data : (res.data?.list || []);
    return { code: 200, data: { list: data, total: data.length, page: params?.page || 1, pageSize: params?.pageSize || 10 } } as any;
  },
  create: (data: any) => httpApi.post('/ai/alerts', normalizeAlert(data)),
  update: (id: string, data: any) => httpApi.put(`/ai/alerts/${id}`, normalizeAlert(data)),
  delete: (id: string) => httpApi.delete(`/ai/alerts/${id}`),
};

export default function SmartAlertPage() {
  return <PageTemplate title="智能预警" icon={AlertTriangle} badge="7条" columns={COLUMNS} service={smartAlertService} fields={FIELDS} emptyDescription="基于规则或模型的预警条目由分析服务写入。若为空请确认 AI/规则引擎已启用且设备数据已接入。" />;
}
