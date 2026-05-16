import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import PageTemplate from '@/sections/PageTemplate';
import { DeviceManagementFlowHint } from '@/sections/device/DeviceManagementFlowHint';
import { deviceMaintenanceService } from '@/api/services';
import { Wrench, ClipboardCheck, AlertTriangle } from 'lucide-react';

const typeMap: Record<string, string> = {
  inspection: '巡检', maintenance: '维保', repair: '维修',
};

const statusMap: Record<string, string> = {
  pending: '待执行', in_progress: '进行中', completed: '已完成', cancelled: '已取消', overdue: '已逾期',
};

const COLUMNS = [
  { key: 'device_code', label: '设备编码', width: '110px' },
  { key: 'device_name', label: '设备名称', width: '150px' },
  { key: 'unit_name', label: '所属单位', width: '140px' },
  { key: 'type', label: '维护类型', width: '80px', render: (v: unknown) => typeMap[String(v)] || String(v) },
  { key: 'plan_date', label: '计划日期', width: '100px' },
  { key: 'actual_date', label: '实际日期', width: '100px' },
  { key: 'executor', label: '执行人', width: '90px' },
  { key: 'status', label: '状态', width: '80px', render: (v: unknown) => {
    const s = String(v);
    const label = statusMap[s] || s;
    const color = s === 'completed' ? 'text-emerald-400' : s === 'overdue' ? 'text-red-400' : s === 'in_progress' ? 'text-blue-400' : 'text-slate-400';
    return <span className={`text-[10px] ${color}`}>{label}</span>;
  }},
];

const FIELDS = [
  { key: 'device_id', label: '设备ID', type: 'text' as const, required: true },
  { key: 'type', label: '维护类型', type: 'select' as const, required: true, options: [
    { label: '巡检', value: 'inspection' },
    { label: '维保', value: 'maintenance' },
    { label: '维修', value: 'repair' },
  ]},
  { key: 'plan_date', label: '计划日期', type: 'date' as const, required: true },
  { key: 'actual_date', label: '实际日期', type: 'date' as const },
  { key: 'executor', label: '执行人', type: 'text' as const },
  { key: 'cost', label: '费用(元)', type: 'number' as const },
  { key: 'content', label: '维护内容', type: 'textarea' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { label: '待执行', value: 'pending' },
    { label: '进行中', value: 'in_progress' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' },
  ]},
];

const FILTER_FIELDS = [
  {
    key: 'type',
    label: '维护类型',
    options: [
      { label: '巡检', value: 'inspection' },
      { label: '维保', value: 'maintenance' },
      { label: '维修', value: 'repair' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '待执行', value: 'pending' },
      { label: '进行中', value: 'in_progress' },
      { label: '已完成', value: 'completed' },
      { label: '已逾期', value: 'overdue' },
    ],
  },
];

export default function DeviceMaintainPage() {
  const [searchParams] = useSearchParams();
  const deviceKeyword = searchParams.get('deviceId') || searchParams.get('keyword') || '';
  const [stats, setStats] = useState({
    pending: 0,
    overdue: 0,
    completed: 0,
    in_progress: 0,
  });

  useEffect(() => {
    deviceMaintenanceService.getStats().then((res) => {
      if (res.code === 200 && res.data) {
        setStats({
          pending: res.data.pending ?? 0,
          overdue: res.data.overdue ?? 0,
          completed: res.data.completed ?? 0,
          in_progress: res.data.in_progress ?? 0,
        });
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header stats */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Wrench className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 leading-tight">设备维护</h2>
              <p className="text-[10px] text-slate-500">巡检、维保、维修计划与执行闭环</p>
            </div>
          </div>
          <div className="sm:ml-auto w-full sm:w-auto min-w-0">
            <DeviceManagementFlowHint active="maintain" />
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-[10px]">
            <ClipboardCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">待执行: <span className="text-blue-400 font-medium">{stats.pending}</span></span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400">进行中: <span className="text-cyan-400 font-medium">{stats.in_progress}</span></span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-slate-400">已逾期: <span className="text-red-400 font-medium">{stats.overdue}</span></span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400">已完成: <span className="text-emerald-400 font-medium">{stats.completed}</span></span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PageTemplate
          title=""
          showHeader={false}
          columns={COLUMNS}
          service={deviceMaintenanceService as any}
          fields={FIELDS}
          filterFields={FILTER_FIELDS}
          initialKeyword={deviceKeyword}
          searchable
          addable
          refreshable
          emptyDescription="维保计划与工单在此汇总。无记录时请确认维保模块接口已对接，或使用「新增」登记维保任务。"
        />
      </div>
    </div>
  );
}
