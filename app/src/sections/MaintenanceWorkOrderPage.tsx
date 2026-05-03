import PageTemplate from '@/sections/PageTemplate';
import { workOrderService } from '@/api/services';
import { Ticket } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '工单编号', width: '120px' },
  { key: 'title', label: '工单标题', width: '180px' },
  { key: 'unitName', label: '服务单位', width: '180px' },
  { key: 'type', label: '工单类型', width: '100px' },
  { key: 'staff', label: '执行人员', width: '100px' },
  { key: 'planDate', label: '计划日期', width: '110px' },
  { key: 'status', label: '状态', width: '100px' },
];

const FIELDS = [
  { key: 'id', label: '工单编号', type: 'text' as const, required: true },
  { key: 'title', label: '工单标题', type: 'text' as const, required: true },
  { key: 'unitName', label: '服务单位', type: 'text' as const, required: true },
  { key: 'type', label: '工单类型', type: 'select' as const, options: ['inspection', 'repair', 'maintenance', 'replacement'] },
  { key: 'content', label: '工作内容', type: 'textarea' as const },
  { key: 'staff', label: '执行人员', type: 'text' as const },
  { key: 'planDate', label: '计划日期', type: 'date' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['pending', 'processing', 'completed', 'cancelled'] },
];

export default function MaintenanceWorkOrderPage() {
  return <PageTemplate title="维保工单" icon={Ticket} columns={COLUMNS} service={workOrderService as any} fields={FIELDS} />;
}
