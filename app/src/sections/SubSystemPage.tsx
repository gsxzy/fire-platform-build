import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router';
import {
  Activity, Droplets, Wind, Zap, Lightbulb, Volume2,
  WifiOff, AlertTriangle, CheckCircle, RefreshCw,
  Shield
} from 'lucide-react';
import { raw } from '@/api/client';
import EmptyState from '@/components/EmptyState';

interface SubSystem {
  id: string;
  name: string;
  type: string;
  unit: string;
  devices: number;
  online: number;
  status: 'normal' | 'warning' | 'fault';
  lastUpdate: string;
}

async function fetchSubsystems(type?: string): Promise<SubSystem[]> {
  return raw.get<SubSystem[]>('/subsystems', type ? { type } : undefined);
}

const TYPE_ICON: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  water: { icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  vent: { icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  elec: { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  light: { icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  audio: { icon: Volume2, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  door: { icon: Activity, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  gas: { icon: Wind, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  normal: { label: '正常', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle },
  warning: { label: '预警', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertTriangle },
  fault: { label: '故障', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: WifiOff },
};

const FILTERS = [
  { k: 'all', l: '全部' },
  { k: 'normal', l: '正常' },
  { k: 'warning', l: '预警' },
  { k: 'fault', l: '故障' },
];

export default function SubSystemPage() {
  const location = useLocation();
  const pathType = location.pathname.split('/').pop(); // water | elec | vent
  const activeType = ['water', 'elec', 'vent'].includes(pathType || '') ? pathType : undefined;

  const [systems, setSystems] = useState<SubSystem[]>([]);
  const [filter, setFilter] = useState('all');
  const [listLoading, setListLoading] = useState(true);

  const loadList = useCallback(() => {
    setListLoading(true);
    return fetchSubsystems(activeType)
      .then(data => setSystems(Array.isArray(data) ? data : []))
      .catch(() => setSystems([]))
      .finally(() => setListLoading(false));
  }, [activeType]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const safeSystems = Array.isArray(systems) ? systems : [];
  const filtered = safeSystems.filter(s => filter === 'all' ? true : s.status === filter);
  const normal = safeSystems.filter(s => s.status === 'normal').length;
  const warning = safeSystems.filter(s => s.status === 'warning').length;
  const totalDevices = safeSystems.reduce((s, x) => s + (Number(x.devices) || 0), 0);

  const refresh = () => {
    void loadList();
  };

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto scrollbar-thin">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">子系统监控</h2>
            <p className="text-[10px] text-slate-500">消防子系统实时状态</p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="text-[10px] px-3 py-1.5 bg-slate-800/60 text-slate-400 rounded-lg hover:text-slate-200 hover:bg-slate-700/40 flex items-center gap-1.5 transition-all border border-slate-700/40"
        >
          <RefreshCw className="w-3 h-3" />
          刷新
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="子系统" value={safeSystems.length} unit="个" color="blue" icon={<Shield className="w-3.5 h-3.5" />} />
        <StatCard label="正常" value={normal} unit="个" color="emerald" icon={<CheckCircle className="w-3.5 h-3.5" />} />
        <StatCard label="预警" value={warning} unit="个" color="yellow" icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        <StatCard label="总设备" value={totalDevices} unit="台" color="cyan" icon={<Activity className="w-3.5 h-3.5" />} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 bg-slate-800/60 rounded-lg border border-slate-700/40 p-0.5">
          {FILTERS.map(f => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`text-[10px] px-3 py-1.5 rounded-md transition-all duration-200 font-medium ${
                filter === f.k
                  ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-600 ml-auto">共 {filtered.length} 个子系统</span>
      </div>

      {/* Subsystem Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[200px]">
        {listLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            <span className="text-xs">子系统数据加载中，请稍候…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              type={filter === 'all' ? 'data' : 'search'}
              title={filter === 'all' ? '暂无子系统数据' : '当前筛选下无子系统'}
              description={
                filter === 'all'
                  ? '请确认后端 /subsystems 已接入真实数据，或检查网络与登录状态后点击「刷新」。'
                  : '请尝试切换为「全部」或调整状态筛选。'
              }
              icon={Shield}
              className="py-12"
            />
          </div>
        ) : (
          filtered.map(sys => {
          const tc = TYPE_ICON[sys.type] || TYPE_ICON.water;
          const sc = STATUS_CFG[sys.status] || STATUS_CFG.normal;
          const TypeIcon = tc.icon;
          const StatusIcon = sc.icon;
          const devices = Number(sys.devices) || 0;
          const online = Number(sys.online) || 0;
          const onlineRate = devices > 0 ? Math.round((online / devices) * 100) : 0;
          const rateColor = onlineRate === 100 ? 'emerald' : onlineRate > 90 ? 'yellow' : 'red';
          const rateText = rateColor === 'emerald' ? 'text-emerald-400' : rateColor === 'yellow' ? 'text-yellow-400' : 'text-red-400';
          const rateBg = rateColor === 'emerald' ? 'bg-emerald-400' : rateColor === 'yellow' ? 'bg-yellow-400' : 'bg-red-400';

          return (
            <div
              key={sys.id}
              className="rounded-xl border border-slate-700/30 bg-slate-800/40 p-4 transition-all duration-300 hover:border-slate-600/40 hover:bg-slate-800/60 hover:shadow-lg group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${tc.bg} flex items-center justify-center border ${tc.border} transition-transform duration-300 group-hover:scale-110`}>
                    <TypeIcon className={`w-5 h-5 ${tc.color}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{sys.name}</div>
                    <div className="text-[10px] text-slate-500">{sys.unit} · {sys.id}</div>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-lg font-medium border ${sc.color} ${sc.bg} ${sc.border} flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className="text-slate-400">在线率</span>
                  <span className={`font-semibold ${rateText}`}>{onlineRate}%</span>
                </div>
                <div className="h-2 bg-slate-700/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${rateBg}`}
                    style={{ width: `${onlineRate}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">
                  设备: <span className="text-slate-300 font-medium">{online}/{devices}</span> 在线
                </span>
                <span className="text-slate-600 font-mono">{(sys.lastUpdate || '').split(' ')[1] || '--:--'}</span>
              </div>
            </div>
          );
          })
        )}
      </div>
    </div>
  );
}

/* ───── Stat Card ───── */
function StatCard({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  color: 'blue' | 'emerald' | 'yellow' | 'cyan';
  icon: React.ReactNode;
}) {
  const map: Record<string, { text: string; bg: string; border: string; iconColor: string }> = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', iconColor: 'text-blue-400' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', iconColor: 'text-emerald-400' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', iconColor: 'text-yellow-400' },
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', iconColor: 'text-cyan-400' },
  };
  const c = map[color];

  return (
    <div className={`rounded-xl p-3.5 border ${c.border} ${c.bg} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
        <div className={c.iconColor}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${c.text} tabular-nums`}>{value}</span>
        <span className="text-[10px] text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
