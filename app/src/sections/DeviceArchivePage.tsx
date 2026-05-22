import { useState, useEffect } from 'react';
import PageTemplate from '@/sections/PageTemplate';
import { DeviceManagementFlowHint } from '@/sections/device/DeviceManagementFlowHint';
import { deviceService } from '@/api/services';
import { Cpu, Activity, WifiOff, Clock, CalendarDays, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { useToast } from '@/core/ToastContext';
import { getErrorMessage } from '@/types/api';
import { archiveService, FIELDS, FILTER_FIELDS } from './deviceArchive/utils';
import { COLUMNS } from './deviceArchive/columns';

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  draft: number;
  today: number;
  month: number;
  expireSoon: number;
  onlineRate: string;
}

const STAT_CARDS = [
  { key: 'total', label: '设备总数', icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { key: 'online', label: '在线设备', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { key: 'offline', label: '离线设备', icon: WifiOff, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { key: 'today', label: '今日入库', icon: Clock, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { key: 'month', label: '本月入库', icon: CalendarDays, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { key: 'expireSoon', label: '即将过期', icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
] as const;

export default function DeviceArchivePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [listTick, setListTick] = useState(0);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const seedKeyword = searchParams.get('keyword') || searchParams.get('deviceId') || '';

  useEffect(() => {
    deviceService.getStats().then((res) => {
      if (res.code === 200 && res.data) {
        setStats(res.data as DeviceStats);
      }
    }).catch(() => { /* ignore */ });
  }, [listTick]);

  const renderStats = () => {
    if (!stats) return null;
    return (
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 animate-fade-in-up">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key as keyof DeviceStats];
          const isNumber = typeof value === 'number';
          return (
            <div
              key={card.key}
              className={`glass rounded-xl px-3 py-2.5 flex items-center gap-2.5 border ${card.border} hover:brightness-110 transition-all`}
            >
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-caption text-slate-400 truncate">{card.label}</span>
                <span className={`text-subhead font-bold ${card.color} truncate`}>
                  {isNumber ? (value as number).toLocaleString() : (value ?? '-')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageTemplate
      key={listTick}
      title="入库管理"
      icon={Cpu}
      badge="设备档案台账"
      badgeColor="text-slate-300 bg-slate-500/10 border-slate-500/25"
      columns={COLUMNS}
      service={archiveService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      initialKeyword={seedKeyword}
      addable
      actions
      batchable
      formInitialDefaults={{ protocolType: 'standard' }}
      showIndex
      headerStats={renderStats()}
      extraHeaderActions={<DeviceManagementFlowHint active="archive" />}
      renderExtraActions={(row: any) => {
        if (row.archiveStatus === 'draft') {
          return (
            <button
              type="button"
              disabled={submittingId === String(row.id)}
              onClick={async () => {
                const id = String(row.id);
                setSubmittingId(id);
                try {
                  const res = await deviceService.update(id, { lifecycleStatus: 1 });
                  if (res.code !== 200) {
                    toastError('提交失败', (res as { msg?: string }).msg || '请重试');
                    return;
                  }
                  success('已入库', '可前往「设备接入」完成协议与网络配置');
                  setListTick((t) => t + 1);
                } catch (e: unknown) {
                  toastError('提交失败', getErrorMessage(e, '请检查网络'));
                } finally {
                  setSubmittingId(null);
                }
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/25 transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              title="将草稿转为已入库后，方可进行平台接入"
            >
              {submittingId === String(row.id) ? '提交中…' : '提交入库'}
            </button>
          );
        }
        if (row.archiveStatus === 'registered') {
          return (
            <button
              onClick={() => navigate(`/device/access?deviceId=${row.id}`)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors whitespace-nowrap flex-shrink-0"
              title="平台接入（协议/网络）"
            >
              去接入
            </button>
          );
        }
        if (row.archiveStatus === 'accessed') {
          // 已接入但实际已有单位 → 显示已分配标签
          if (row.unitId) {
            return (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 whitespace-nowrap flex-shrink-0">
                已分配
              </span>
            );
          }
          return (
            <button
              onClick={() => navigate(`/device/allocate?deviceId=${row.id}`)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors whitespace-nowrap flex-shrink-0"
              title="绑定单位/项目"
            >
              去分配
            </button>
          );
        }
        if (row.archiveStatus === 'assigned') {
          return (
            <div className="flex flex-col gap-0.5 items-end">
              <div className="flex items-center gap-1">
                <span className="text-[9px] px-1 py-0 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 whitespace-nowrap flex-shrink-0 leading-4" title="已完成平台接入">
                  已接入
                </span>
                <span className="text-[9px] px-1 py-0 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 whitespace-nowrap flex-shrink-0 leading-4" title="已完成单位分配">
                  已分配
                </span>
              </div>
              <button
                onClick={() => navigate(`/device/config?keyword=${encodeURIComponent(row.deviceNo || row.id)}`)}
                className="text-[9px] px-1 py-0 rounded bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/20 transition-colors whitespace-nowrap flex-shrink-0 leading-4"
                title="业务参数（阈值、联动等）"
              >
                去配置
              </button>
              <button
                type="button"
                onClick={() => navigate(`/device/maintain?deviceId=${encodeURIComponent(row.id)}`)}
                className="text-[9px] px-1 py-0 rounded bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 border border-amber-500/25 transition-colors whitespace-nowrap flex-shrink-0 leading-4"
                title="登记或查看该设备的维保/巡检记录"
              >
                去维护
              </button>
            </div>
          );
        }
        return null;
      }}
      emptyDescription="此处为全平台设备唯一源头：新增默认为「草稿」，核对 SN/型号后点「提交入库」进入「已入库」，再依次完成「设备接入」→「设备分配」→「设备配置」。禁止从接入页凭空创建设备档案。"
    />
  );
}
