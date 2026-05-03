import PageTemplate from '@/sections/PageTemplate';
import { logService } from '@/api/services';
import { FileText } from 'lucide-react';

const COLUMNS = [
  { key: 'time', label: '操作时间', width: '150px' },
  { key: 'userName', label: '操作人', width: '100px' },
  { key: 'action', label: '操作类型', width: '100px' },
  { key: 'module', label: '操作模块', width: '120px' },
  { key: 'detail', label: '操作内容', width: '250px' },
  { key: 'result', label: '结果', width: '80px' },
];

const FIELDS = [
  { key: 'action', label: '操作类型', type: 'text' as const },
  { key: 'module', label: '操作模块', type: 'text' as const },
  { key: 'detail', label: '操作内容', type: 'textarea' as const },
  { key: 'result', label: '结果', type: 'select' as const, options: ['success', 'fail'] },
];

export default function SystemLogPage() {
  return <PageTemplate title="系统日志" icon={FileText} columns={COLUMNS} service={logService as any} fields={FIELDS} addable={false} actions={false} />;
}
