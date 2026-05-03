import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import DataContainer from '@/components/DataContainer';
import {
  Cpu, Wifi, WifiOff, AlertTriangle,
  Activity, RefreshCw, Wrench
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';

/* ═══════ 设备运行分析 ═══════ */

const onlineTrendInit = [
  { day: '周一', rate: 97.2 },
  { day: '周二', rate: 96.8 },
  { day: '周三', rate: 95.5 },
  { day: '周四', rate: 96.1 },
  { day: '周五', rate: 97.5 },
  { day: '周六', rate: 96.9 },
  { day: '周日', rate: 96.5 },
];

const deviceTypesInit = [
  { name: '烟感探测器', total: 1850, online: 1823, offline: 27 },
  { name: '温感探测器', total: 620, online: 612, offline: 8 },
  { name: '手动报警', total: 156, online: 150, offline: 6 },
  { name: '消防泵', total: 45, online: 43, offline: 2 },
  { name: '排烟风机', total: 32, online: 30, offline: 2 },
  { name: '防火阀', total: 89, online: 87, offline: 2 },
  { name: '电气监控', total: 120, online: 118, offline: 2 },
  { name: '应急照明', total: 386, online: 383, offline: 3 },
];

const faultTrendInit = [
  { month: '1月', new: 12, resolved: 10 },
  { month: '2月', new: 8, resolved: 9 },
  { month: '3月', new: 15, resolved: 14 },
  { month: '4月', new: 10, resolved: 8 },
];

const statusDistInit = [
  { name: '在线正常', value: 3246, color: '#10b981' },
  { name: '离线', value: 42, color: '#64748b' },
  { name: '故障', value: 18, color: '#ef4444' },
  { name: '维修中', value: 8, color: '#f59e0b' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700/50 rounded-lg p-2 shadow-xl">
        <p className="text-[10px] text-slate-300 font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-[9px]" style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DeviceAnalysisPage() {
  const [onlineTrend, setOnlineTrend] = useState(onlineTrendInit as any);
  const [deviceTypes, setDeviceTypes] = useState(deviceTypesInit as any);
  const [faultTrend, setFaultTrend] = useState(faultTrendInit as any);
  const [statusDist, setStatusDist] = useState(statusDistInit as any);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await legacyApi.deviceAnalysis() as any;
      const data = res.data ?? res;
      if (data && typeof data === 'object') {
        if (Array.isArray(data.onlineTrend)) setOnlineTrend(data.onlineTrend as any);
        if (Array.isArray(data.deviceTypes)) setDeviceTypes(data.deviceTypes as any);
        if (Array.isArray(data.faultTrend)) setFaultTrend(data.faultTrend as any);
        if (Array.isArray(data.statusDist)) setStatusDist(data.statusDist as any);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const totalDevices = 3314;
  const onlineDevices = 3246;
  const onlineRate = ((onlineDevices / totalDevices) * 100).toFixed(1);

  return (
    <DataContainer loading={loading} error={error} data={onlineTrend} onRetry={loadData} emptyText="暂无数据">
    <div className="space-y-4">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">设备运行分析</h2>
            <p className="text-[10px] text-slate-500">实时监控设备健康状态</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className={`text-[10px] px-3 py-1.5 bg-slate-700/30 text-slate-400 rounded-lg hover:text-slate-200 hover:bg-slate-700/50 flex items-center gap-1.5 transition-colors border border-slate-700/40 ${refreshing ? 'animate-pulse' : ''}`}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />刷新数据
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '设备总数', value: totalDevices.toLocaleString(), icon: Cpu, color: '#3b82f6', sub: '全部联网' },
          { label: '在线设备', value: onlineDevices.toLocaleString(), icon: Wifi, color: '#10b981', sub: `在线率 ${onlineRate}%` },
          { label: '离线设备', value: '42', icon: WifiOff, color: '#64748b', sub: '需排查' },
          { label: '故障设备', value: '18', icon: AlertTriangle, color: '#ef4444', sub: '待维修' },
          { label: '维修中', value: '8', icon: Wrench, color: '#f59e0b', sub: '处理中' },
        ].map((s: any, i: number) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <span className="text-[10px] text-slate-400">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">{s.value}</div>
              <div className="text-[9px] mt-1" style={{ color: s.color }}>{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-3">
        {/* Online Rate Trend */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-200">设备在线率趋势</span>
            <span className="text-[9px] text-emerald-400">本周平均 96.5%</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={onlineTrend}>
              <defs>
                <linearGradient id="o1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[94, 100]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={22} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" name="在线率%" stroke="#10b981" fill="url(#o1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs font-medium text-slate-200 mb-3">设备状态分布</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" label={(_props: any) => `${(_props.percent * 100).toFixed(1)}%`} labelLine={false}>
                {statusDist.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} iconSize={6} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Fault Trend */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs font-medium text-slate-200 mb-3">故障处理趋势</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={faultTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={18} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} iconSize={6} />
              <Bar dataKey="new" name="新增故障" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={16} />
              <Bar dataKey="resolved" name="已解决" fill="#10b981" radius={[2, 2, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device Type Detail */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-200">设备类型在线详情</span>
          <span className="text-[9px] text-slate-500">共8类设备</span>
        </div>
        <div className="space-y-2">
          {deviceTypes.map((d: any, i: number) => {
            const rate = ((d.online / d.total) * 100).toFixed(1);
            const isGood = parseFloat(rate) >= 98;
            return (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-900/30 rounded-lg">
                <div className="w-24 text-[10px] text-slate-300 truncate">{d.name}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-slate-500">{d.online}/{d.total}</span>
                    <span className={`text-[9px] font-medium ${isGood ? 'text-emerald-400' : 'text-yellow-400'}`}>{rate}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isGood ? 'bg-emerald-400' : 'bg-yellow-400'}`} style={{ width: `${rate}%` }} />
                  </div>
                </div>
                {d.offline > 0 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex-shrink-0">{d.offline}离线</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </DataContainer>
  );
}
