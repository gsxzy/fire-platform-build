import { useState, useEffect, useMemo, useCallback } from 'react';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { useNavigate } from 'react-router';
import { dashboardService } from '@/api/services';
import DataContainer from '@/components/DataContainer';
import {
  Monitor, Bell, Cpu, Video, MapPin, Clock
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';

const systemsInit: any[] = [];

const typeColors: Record<string, string> = {
  '火警': '#ef4444',
  '故障': '#f59e0b',
  '监管': '#3b82f6',
};

const levelColors: Record<string, string> = {
  '紧急': 'text-red-400 bg-red-500/10',
  '重要': 'text-orange-400 bg-orange-500/10',
  '一般': 'text-blue-400 bg-blue-500/10',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/50 rounded-lg p-2 shadow-xl">
        <p className="text-[10px] text-slate-300 font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-[9px]" style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ScreenDashboardPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [pulseIndex, setPulseIndex] = useState(0);
  const [hourlyData, setHourlyData] = useState([] as any);
  const [unitAlarmData, setUnitAlarmData] = useState([] as any);
  const [deviceTypeDist, setDeviceTypeDist] = useState([] as any);
  const [recentAlarms, setRecentAlarms] = useState([] as any);
  const [systems, setSystems] = useState(systemsInit as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.bigScreen() as any;
      const data = res.data ?? res;
      if (data && typeof data === 'object') {
        if (Array.isArray(data.hourlyData)) setHourlyData(data.hourlyData as any);
        if (Array.isArray(data.unitAlarmData)) setUnitAlarmData(data.unitAlarmData as any);
        if (Array.isArray(data.deviceTypeDist)) setDeviceTypeDist(data.deviceTypeDist as any);
        if (Array.isArray(data.recentAlarms)) setRecentAlarms(data.recentAlarms as any);
        if (Array.isArray(data.systems)) setSystems(data.systems as any);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useVisibilityPolling(loadData, 30000);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setPulseIndex(i => (i + 1) % systems.length), 2000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => [
    { label: '联网单位', value: '--', unit: '家', icon: MapPin, color: '#3b82f6', sub: '在线 --家' },
    { label: '在线设备', value: '--', unit: '台', icon: Cpu, color: '#10b981', sub: '离线 --台' },
    { label: '视频通道', value: '--', unit: '路', icon: Video, color: '#8b5cf6', sub: '在线 --路' },
    { label: '今日告警', value: '--', unit: '条', icon: Bell, color: '#ef4444', sub: '已处理 --条' },
  ], []);

  return (
    <DataContainer loading={loading} error={error} data={hourlyData} onRetry={loadData} emptyText="暂无数据">
    <div className="h-full flex flex-col gap-3" style={{ minHeight: 'calc(100vh - 7rem)' }}>
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0 px-3 md:px-5 py-2.5 md:py-3 border border-blue-500/20 rounded-xl glass animate-fade-in-up">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/10 flex-shrink-0">
            <Monitor className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
          </div>
          <h1 className="text-sm md:text-title font-bold text-slate-100 tracking-wider truncate">智慧消防监控大屏</h1>
          <span className="hidden sm:inline text-caption text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-lg bg-blue-500/10">实时数据</span>
        </div>
        <div className="flex items-center gap-2 md:gap-5 flex-wrap">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
            <span className="text-[10px] md:text-body font-mono text-slate-300 tracking-wider">
              {time.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-caption text-emerald-400">系统运行正常</span>
          </div>
          <button onClick={() => navigate(-1)} className="text-[10px] md:text-caption px-2 md:px-3 py-1 md:py-1.5 bg-slate-800/60 border border-slate-700/40 text-slate-400 rounded-lg hover:text-slate-200 hover:bg-slate-700/40 transition-all">
            退出大屏
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left Column */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:gap-3">
            {(stats as any).map((s: any, i: number) => {
              const Icon = s.icon;
              return (
                <div key={i} className="p-2.5 md:p-3.5 rounded-xl border border-slate-700/30 flex items-center gap-2 md:gap-3 glass hover:border-slate-600/30 transition-all animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/5" style={{ backgroundColor: `${s.color}15` }}>
                    <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] md:text-caption text-slate-400">{s.label}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm md:text-headline font-bold text-slate-100 tracking-tight">{s.value}</span>
                      <span className="text-[10px] md:text-caption text-slate-500">{s.unit}</span>
                    </div>
                    <div className="hidden md:block text-label text-slate-500">{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subsystem Status */}
          <div className="flex-1 p-3 rounded-lg border border-slate-700/30" style={{ background: 'rgba(30,41,59,0.4)' }}>
            <div className="text-xs font-medium text-slate-200 mb-3">子系统状态</div>
            <div className="space-y-2">
              {systems.map((sys: any, i: number) => {
                const Icon = sys.icon;
                const isActive = pulseIndex === i;
                return (
                  <div key={sys.name} className={`flex items-center gap-2 p-2 rounded-lg transition-all ${isActive ? 'bg-slate-700/30 border border-blue-500/20' : ''}`}>
                    <Icon className="w-4 h-4" style={{ color: sys.color }} />
                    <span className="text-[10px] text-slate-300 flex-1">{sys.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${sys.status === '正常' ? 'text-emerald-400 bg-emerald-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>{sys.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="p-3 rounded-lg border border-slate-700/30" style={{ background: 'rgba(30,41,59,0.4)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-200">今日告警时序</span>
              <span className="text-[9px] text-slate-500">24小时</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} width={18} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="alarm" name="火警" stroke="#ef4444" fill="url(#g1)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="fault" name="故障" stroke="#f59e0b" fill="url(#g2)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 p-3 rounded-lg border border-slate-700/30" style={{ background: 'rgba(30,41,59,0.4)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-200">单位告警排行</span>
              <span className="text-[9px] text-slate-500">本月</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitAlarmData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="告警数" fill="#ef4444" radius={[0, 3, 3, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="p-3 rounded-lg border border-slate-700/30" style={{ background: 'rgba(30,41,59,0.4)' }}>
            <div className="text-xs font-medium text-slate-200 mb-2">设备类型分布</div>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={deviceTypeDist} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                  {deviceTypeDist.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '8px', color: '#94a3b8' }} iconSize={6} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 p-3 rounded-lg border border-slate-700/30 flex flex-col" style={{ background: 'rgba(30,41,59,0.4)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-200">最近告警</span>
              <span className="text-[9px] text-red-400 animate-pulse">实时</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5">
              {recentAlarms.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-slate-700/20" style={{ background: 'rgba(15,23,42,0.3)' }}>
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: typeColors[a.type] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-300 font-medium truncate">{a.device}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] text-slate-500">{a.unit}</span>
                      <span className="text-[8px] text-slate-600">{a.time}</span>
                    </div>
                  </div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded ${levelColors[a.level]}`}>{a.level}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-700/30 grid grid-cols-2 gap-2" style={{ background: 'rgba(30,41,59,0.4)' }}>
            <div className="text-center p-2 rounded" style={{ background: 'rgba(15,23,42,0.3)' }}>
              <div className="text-sm font-bold text-emerald-400">93.2%</div>
              <div className="text-[8px] text-slate-500">告警处理率</div>
            </div>
            <div className="text-center p-2 rounded" style={{ background: 'rgba(15,23,42,0.3)' }}>
              <div className="text-sm font-bold text-blue-400">3.2min</div>
              <div className="text-[8px] text-slate-500">平均响应</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </DataContainer>
  );
}
