import PageTemplate from '@/sections/PageTemplate';
import { maintContractService } from '@/api/services';
import { FileSignature } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: '合同编号', width: '120px' },
  { key: 'name', label: '合同名称', width: '180px' },
  { key: 'unitName', label: '服务单位', width: '180px' },
  { key: 'company', label: '维保公司', width: '150px' },
  { key: 'startDate', label: '起始日期', width: '110px' },
  { key: 'endDate', label: '终止日期', width: '110px' },
  { key: 'amount', label: '合同金额', width: '100px' },
  { key: 'status', label: '状态', width: '90px' },
];

const FIELDS = [
  { key: 'id', label: '合同编号', type: 'text' as const, required: true },
  { key: 'name', label: '合同名称', type: 'text' as const, required: true },
  { key: 'unitName', label: '服务单位', type: 'text' as const, required: true },
  { key: 'company', label: '维保公司', type: 'text' as const, required: true },
  { key: 'startDate', label: '起始日期', type: 'date' as const },
  { key: 'endDate', label: '终止日期', type: 'date' as const },
  { key: 'amount', label: '合同金额', type: 'text' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['active', 'expiring', 'expired'] },
];

export default function MaintenanceContractPage() {
  return <PageTemplate title="维保合同" icon={FileSignature} columns={COLUMNS} service={maintContractService as any} fields={FIELDS} />;
}
