import PageTemplate from '@/sections/PageTemplate';
import { alarmService } from '@/api/services';
import { Clock } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '告警编号', width: '110px' },
  { key: 'type', label: '告警类型', width: '100px' },
  { key: 'device', label: '设备名称', width: '180px' },
  { key: 'unit', label: '所属单位', width: '160px' },
  { key: 'location', label: '位置', width: '120px' },
  { key: 'time', label: '告警时间', width: '140px' },
  { key: 'status', label: '处理状态', width: '90px' },
  { key: 'duration', label: '持续时长', width: '90px' },
];

const FIELDS = [
  { key: 'id', label: '告警编号', type: 'text' as const, required: true, placeholder: '如: ALM-20260419-001' },
  { key: 'type', label: '告警类型', type: 'select' as const, required: true, options: ['火警', '故障', '监管', '预警', '测试'] },
  { key: 'device', label: '设备名称', type: 'text' as const, required: true },
  { key: 'unit', label: '所属单位', type: 'select' as const, required: true, options: ['万达广场', '兰州中心', '兰大二院', '甘肃赋安', '新致远'] },
  { key: 'location', label: '安装位置', type: 'text' as const, required: true },
  { key: 'time', label: '告警时间', type: 'text' as const, required: true, placeholder: 'YYYY-MM-DD HH:mm:ss' },
  { key: 'status', label: '处理状态', type: 'select' as const, required: true, options: ['未处理', '已确认', '已处理'] },
  { key: 'duration', label: '持续时长', type: 'text' as const },
];

export default function AlarmHistoryPage() {
  return <PageTemplate title="历史告警" icon={Clock} badge="10条" columns={COLUMNS} service={alarmService as any} fields={FIELDS} />;
}
