import PageTemplate from '@/sections/PageTemplate';
import { maintRecordService } from '@/api/services';
import { Wrench } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '记录编号', width: '120px' },
  { key: 'unitName', label: '服务单位', width: '180px' },
  { key: 'deviceName', label: '设备名称', width: '150px' },
  { key: 'type', label: '维保类型', width: '100px' },
  { key: 'content', label: '维保内容', width: '200px' },
  { key: 'staff', label: '维保人员', width: '100px' },
  { key: 'date', label: '维保日期', width: '110px' },
];

const FIELDS = [
  { key: 'id', label: '记录编号', type: 'text' as const, required: true },
  { key: 'unitName', label: '服务单位', type: 'text' as const, required: true },
  { key: 'deviceName', label: '设备名称', type: 'text' as const },
  { key: 'type', label: '维保类型', type: 'select' as const, options: ['inspection', 'repair', 'maintenance', 'replacement'] },
  { key: 'content', label: '维保内容', type: 'textarea' as const },
  { key: 'staff', label: '维保人员', type: 'text' as const },
  { key: 'date', label: '维保日期', type: 'date' as const },
];

export default function MaintenanceRecordPage() {
  return <PageTemplate title="维保记录" icon={Wrench} columns={COLUMNS} service={maintRecordService as any} fields={FIELDS} />;
}
