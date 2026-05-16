import PageTemplate from '@/sections/PageTemplate';
import { logService } from '@/api/services';
import { FileText } from 'lucide-react';

const resultMap: Record<string, string> = {
  success: '成功',
  fail: '失败',
};

const resultColorMap: Record<string, string> = {
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  fail: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const COLUMNS = [
  { key: 'time', label: '操作时间', width: '150px' },
  { key: 'userName', label: '操作人', width: '100px' },
  { key: 'module', label: '操作模块', width: '120px' },
  { key: 'action', label: '操作类型', width: '100px' },
  { key: 'detail', label: '操作内容', width: '220px' },
  { key: 'ip', label: 'IP地址', width: '110px' },
  {
    key: 'result',
    label: '结果',
    width: '70px',
    render: (v: unknown) => {
      const result = String(v);
      const label = resultMap[result] || result;
      const style = resultColorMap[result] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];

const FILTER_FIELDS = [
  {
    key: 'result',
    label: '结果',
    options: [
      { label: '成功', value: 'success' },
      { label: '失败', value: 'fail' },
    ],
  },
  {
    key: 'action',
    label: '操作类型',
    options: [
      { label: '新增', value: 'create' },
      { label: '修改', value: 'update' },
      { label: '删除', value: 'delete' },
      { label: '查询', value: 'query' },
      { label: '登录', value: 'login' },
      { label: '导出', value: 'export' },
    ],
  },
];

export default function SystemLogPage() {
  return (
    <PageTemplate
      title="系统日志"
      icon={FileText}
      columns={COLUMNS}
      service={logService as any}
      filterFields={FILTER_FIELDS}
      addable={false}
      actions={false}
      batchable={false}
      emptyDescription="操作与接口审计日志由后端写入。无记录时请确认日志服务已开启，或调整时间/关键词筛选。"
    />
  );
}
