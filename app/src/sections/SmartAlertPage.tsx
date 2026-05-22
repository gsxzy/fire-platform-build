import { useState, useEffect } from 'react';
import PageTemplate from '@/sections/PageTemplate';
import { smartAlertService } from '@/api/services';
import type { QueryParams } from '@/types/db';
import { AlertTriangle } from 'lucide-react';

const COLUMNS = [
  { key: 'alert_no', label: '预警编号', width: '140px' },
  { key: 'device_name', label: '设备名称', width: '180px' },
  { key: 'alert_type', label: '预警类型', width: '110px' },
  { key: 'confidence', label: '置信度', width: '90px' },
  { key: 'alert_desc', label: '预警描述', width: '260px' },
  { key: 'predict_time', label: '预警时间', width: '150px' },
  { key: 'status', label: '处理状态', width: '100px' },
];

const FIELDS = [
  { key: 'device_name', label: '设备名称', type: 'text' as const, required: true },
  { key: 'alert_type', label: '预警类型', type: 'select' as const, required: true, options: ['趋势预警', '寿命预警', '环境预警'] },
  { key: 'alert_desc', label: '预警描述', type: 'textarea' as const },
  { key: 'predict_time', label: '预警时间', type: 'text' as const, placeholder: 'YYYY-MM-DD HH:mm:ss' },
  { key: 'status', label: '处理状态', type: 'select' as const, options: ['未处理', '已确认', '已处理'] },
];

const TYPE_LABEL_MAP: Record<string, string> = {
  '1': '趋势预警',
  '2': '寿命预警',
  '3': '环境预警',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  '0': '未处理',
  '1': '已确认',
  '2': '已处理',
};

/** 前端表单 → 后端 DTO 映射 */
const normalizeAlert = (data: any) => {
  const typeMap: Record<string, number> = {
    '趋势预警': 1,
    '寿命预警': 2,
    '环境预警': 3,
  };
  const statusMap: Record<string, number> = {
    '未处理': 0,
    '已确认': 1,
    '已处理': 2,
  };
  return {
    alert_no: data.alert_no || `SW${Date.now()}${Math.floor(Math.random() * 100)}`,
    device_name: data.device_name || '',
    alert_type: typeMap[data.alert_type] || 1,
    alert_desc: data.alert_desc || '',
    predict_time: data.predict_time || new Date().toISOString(),
    status: statusMap[data.status] ?? 0,
    confidence: data.confidence ?? 80,
  };
};

/** 后端字段 → 前端展示映射（PageTemplate 消费） */
const mapAlertToFrontend = (row: any) => ({
  ...row,
  alert_type: (() => { const s = row.alert_type == null ? '' : String(row.alert_type); return TYPE_LABEL_MAP[s] || s || '-'; })(),
  status: (() => { const s = row.status == null ? '' : String(row.status); return STATUS_LABEL_MAP[s] || s || '-'; })(),
  predict_time: row.predict_time
    ? new Date(row.predict_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '--',
  confidence: row.confidence ? `${Math.round(parseFloat(row.confidence))}%` : '--',
});

export default function SmartAlertPage() {
  const [badge, setBadge] = useState('AI驱动');

  useEffect(() => {
    smartAlertService.alertCount().then((res: any) => {
      const data = res?.data ?? res;
      if (data && typeof data === 'object') {
        const pending = data.pending ?? 0;
        setBadge(pending > 0 ? `${pending}条待处理` : 'AI驱动');
      }
    }).catch(() => { /* 静默失败，保持默认 badge */ });
  }, []);

  const smartAlertServiceWrapped = {
    list: async (params: QueryParams = {}) => {
      const res = await smartAlertService.alertList(params) as any;
      const data = Array.isArray(res) ? res : (res?.list ?? res?.data ?? []);
      const mapped = (Array.isArray(data) ? data : []).map(mapAlertToFrontend);
      return {
        code: 200,
        data: { list: mapped, total: mapped.length, page: params?.page || 1, pageSize: params?.pageSize || 10 },
      } as any;
    },
    create: (data: any) => smartAlertService.createAlert(normalizeAlert(data)),
    update: (id: string, data: any) => smartAlertService.updateAlert(+id, normalizeAlert(data)),
    delete: (id: string) => smartAlertService.deleteAlert(+id),
  };

  return (
    <PageTemplate
      title="智能预警"
      icon={AlertTriangle}
      badge={badge}
      columns={COLUMNS}
      service={smartAlertServiceWrapped}
      fields={FIELDS}
      emptyDescription="基于规则或模型的预警条目由分析服务写入。若为空请确认 AI/规则引擎已启用且设备数据已接入。"
    />
  );
}
