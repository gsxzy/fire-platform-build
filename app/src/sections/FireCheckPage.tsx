import { useState } from 'react';
import PageTemplate from '@/sections/PageTemplate';
import { inspectionService } from '@/api/services';
import { ClipboardCheck, FileText } from 'lucide-react';

const resultMap: Record<string, string> = {
  '1': '合格',
  '2': '不合格',
  '3': '限期整改',
};

const resultColorMap: Record<string, string> = {
  '1': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  '2': 'text-red-400 bg-red-500/10 border-red-500/20',
  '3': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const statusMap: Record<string, string> = {
  '1': '无需整改',
  '2': '待整改',
  '3': '整改中',
  '4': '已完成',
};

const statusColorMap: Record<string, string> = {
  '1': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  '2': 'text-red-400 bg-red-500/10 border-red-500/20',
  '3': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  '4': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const COLUMNS = [
  { key: 'inspect_no', label: '检查编号', width: '130px' },
  { key: 'unit_name', label: '检查单位', width: '150px' },
  { key: 'inspector', label: '检查人员', width: '100px' },
  { key: 'inspect_date', label: '检查日期', width: '110px' },
  {
    key: 'result',
    label: '结果',
    width: '90px',
    render: (v: unknown) => {
      const key = String(v);
      const label = resultMap[key] || key;
      const style = resultColorMap[key] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  {
    key: 'status',
    label: '整改状态',
    width: '90px',
    render: (v: unknown) => {
      const key = String(v);
      const label = statusMap[key] || key;
      const style = statusColorMap[key] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  { key: 'hazard_id', label: '关联隐患', width: '100px' },
];

const FIELDS = [
  { key: 'unit_name', label: '检查单位', type: 'text' as const, required: true },
  { key: 'inspect_type', label: '检查类型', type: 'select' as const, options: ['日常检查', '专项检查', '联合检查'] },
  { key: 'inspector', label: '检查人员', type: 'text' as const },
  { key: 'inspect_date', label: '检查日期', type: 'date' as const },
  {
    key: 'result',
    label: '结果',
    type: 'select' as const,
    options: [
      { label: '合格', value: '1' },
      { label: '不合格', value: '2' },
      { label: '限期整改', value: '3' },
    ],
  },
  {
    key: 'status',
    label: '整改状态',
    type: 'select' as const,
    options: [
      { label: '无需整改', value: '1' },
      { label: '待整改', value: '2' },
      { label: '整改中', value: '3' },
      { label: '已完成', value: '4' },
    ],
  },
  { key: 'items', label: '检查项(JSON)', type: 'textarea' as const, placeholder: '[{"name":"灭火器压力","standard":"≥1.0MPa","required":true}]' },
];

const FILTER_FIELDS = [
  {
    key: 'result',
    label: '结果',
    options: [
      { label: '合格', value: '1' },
      { label: '不合格', value: '2' },
      { label: '限期整改', value: '3' },
    ],
  },
  {
    key: 'status',
    label: '整改状态',
    options: [
      { label: '无需整改', value: '1' },
      { label: '待整改', value: '2' },
      { label: '整改中', value: '3' },
      { label: '已完成', value: '4' },
    ],
  },
];

/** 表单数据 → 后端 DTO */
const normalizeInspection = (data: any) => {
  const typeMap: Record<string, number> = { '日常检查': 1, '专项检查': 2, '联合检查': 3 };
  return {
    ...data,
    inspect_type: typeof data.inspect_type === 'string' ? (typeMap[data.inspect_type] || 1) : data.inspect_type,
    result: typeof data.result === 'string' ? parseInt(data.result, 10) : data.result,
    status: typeof data.status === 'string' ? parseInt(data.status, 10) : data.status,
  };
};

/** 模板页字段 */
const TEMPLATE_COLUMNS = [
  { key: 'template_name', label: '模板名称', width: '200px' },
  { key: 'inspect_type', label: '检查类型', width: '120px' },
  { key: 'items', label: '检查项', width: '300px' },
  { key: 'status', label: '状态', width: '80px' },
];

const TEMPLATE_FIELDS = [
  { key: 'template_name', label: '模板名称', type: 'text' as const, required: true },
  { key: 'inspect_type', label: '检查类型', type: 'select' as const, options: ['日常检查', '专项检查', '联合检查'] },
  { key: 'items', label: '检查项(JSON)', type: 'textarea' as const, placeholder: '[{"name":"灭火器压力","standard":"≥1.0MPa","required":true}]' },
];

export default function FireCheckPage() {
  const [tab, setTab] = useState<'inspection' | 'template'>('inspection');

  const inspectionServiceWrapped = {
    list: inspectionService.list,
    create: (data: any) => inspectionService.create(normalizeInspection(data)),
    update: (id: string, data: any) => inspectionService.update(id, normalizeInspection(data)),
    delete: inspectionService.delete,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('inspection')}
          className={`text-[10px] px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${
            tab === 'inspection' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:text-slate-200'
          }`}
        >
          <ClipboardCheck className="w-3 h-3" />检查记录
        </button>
        <button
          onClick={() => setTab('template')}
          className={`text-[10px] px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${
            tab === 'template' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3 h-3" />检查项模板
        </button>
      </div>

      {tab === 'inspection' ? (
        <PageTemplate
          title="消防检查"
          icon={ClipboardCheck}
          columns={COLUMNS}
          service={inspectionServiceWrapped as any}
          fields={FIELDS}
          filterFields={FILTER_FIELDS}
          emptyDescription="防火检查项与整改单在此跟踪。检查结果为「不合格」或「限期整改」时，系统自动创建隐患记录。"
        />
      ) : (
        <PageTemplate
          title="检查项模板"
          icon={FileText}
          columns={TEMPLATE_COLUMNS}
          service={inspectionService as any}
          fields={TEMPLATE_FIELDS}
          emptyDescription="检查项模板用于快速发起检查任务。创建检查时可选择模板，自动填充检查项。"
        />
      )}
    </div>
  );
}
