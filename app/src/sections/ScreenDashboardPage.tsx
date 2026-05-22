import { useState, useEffect, useMemo, useCallback } from 'react';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { useNavigate } from 'react-router';
import { dashboardService } from '@/api/services';
import DataContainer from '@/components/DataContainer';
import { logger } from '@/lib/logger';
import {
  Monitor, Bell, Cpu, Video, MapPin, Clock, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';
import ScreenMapPanel from './screenDashboard/ScreenMapPanel';

const systemsInit: any[] = [];

const typeColors: Record<string, string> = {
  '火警': '#ef4444',
  '故障': '#f59e0b',
  '监管': '#3b82f6',
};

const levelConfig: Record<string, { text: string; bg: string; cls: string }> = {
  '紧急': { text: 'text-red-400', bg: 'bg-red-500/10', cls: 'bs-alarm-urgent' },
  '重要': { text: 'text-orange-400', bg: 'bg-orange-500/10', cls: 'bs-alarm-important' },
  '一般': { text: 'text-blue-400', bg: 'bg-blue-500/10', cls: 'bs-alarm-normal' },
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
  const [screenData, setScreenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [screenRes, dataRes] = await Promise.all([
        dashboardService.bigScreen().catch((e) => { logger.error('[大屏] 数据加载失败:', e); return null; }),
        dashboardService.bigScreenConfig().catch((e) => { logger.error('[大屏] 配置加载失败:', e); return null; }),
      ]);
      const data = (screenRes as any)?.data ?? screenRes ?? {};
      if (data && typeof data === 'object') {
        if (Array.isArray(data.hourlyData)) setHourlyData(data.hourlyData);
        if (Array.isArray(data.unitAlarmData)) setUnitAlarmData(data.unitAlarmData);
        if (Array.isArray(data.deviceTypeDist)) setDeviceTypeDist(data.deviceTypeDist);
        if (Array.isArray(data.recentAlarms)) setRecentAlarms(data.recentAlarms);
        if (Array.isArray(data.systems)) setSystems(data.systems);
        setScreenData(data.summary || null);
      }
      const cfg = (dataRes as any)?.data ?? dataRes;
      if (cfg && typeof cfg === 'object') {
        // 大屏配置后续可驱动布局，当前仅记录
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
    if (systems.length === 0) return;
    const timer = setInterval(() => setPulseIndex(i => (i + 1) % systems.length), 2000);
    return () => clearInterval(timer);
  }, [systems]);

  const stats = useMemo(() => {
    const s = screenData || {};
    return [
      { label: '联网单位', value: String(s.unitCount ?? '--'), unit: '家', icon: MapPin, color: '#3b82f6', bar: 'bs-stat-bar-blue', sub: `在线 ${s.onlineCount ?? '--'}家` },
      { label: '在线设备', value: String(s.onlineCount ?? '--'), unit: '台', icon: Cpu, color: '#10b981', bar: 'bs-stat-bar-green', sub: `离线 ${(s.deviceCount ?? 0) - (s.onlineCount ?? 0)}台` },
      { label: '设备总数', value: String(s.deviceCount ?? '--'), unit: '台', icon: Video, color: '#8b5cf6', bar: 'bs-stat-bar-purple', sub: `在线率 ${s.onlineRate ?? '--'}%` },
      { label: '今日告警', value: String(s.alarmToday ?? '--'), unit: '条', icon: Bell, color: '#ef4444', bar: 'bs-stat-bar-red', sub: `累计 ${s.alarmTotal ?? '--'}条` },
    ];
  }, [screenData]);

  return (
    <DataContainer loading={loading} error={error} data={screenData} onRetry={loadData} emptyText="暂无数据" allowEmptyChildren>
    <div className="h-full flex flex-col gap-3 bigscreen-root" style={{ minHeight: 'calc(100vh - 7rem)' }}>
      {/* ═══════ Header Bar ═══════ */}
      <div className="bs-header flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0 px-4 md:px-6 py-3 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/10 border border-blue-500/25 flex items-center justify-center shadow-lg shadow-blue-500/10 flex-shrink-0">
            <Monitor className="w-5 h-5 md:w-5 md:h-5 text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold text-slate-100 tracking-wider truncate">智慧消防监控大屏</h1>
            <span className="hidden sm:inline text-[10px] text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded bg-cyan-500/8 tracking-widest">实时数据</span>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-5 flex-wrap">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
            <span className="text-[10px] md:text-xs font-mono text-slate-300 tracking-wider">
              {time.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/8 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="text-[10px] text-emerald-400 tracking-wide">系统运行正常</span>
          </div>
          <button onClick={() => navigate(-1)} className="text-[10px] md:text-xs px-3 py-1.5 bg-slate-800/60 border border-slate-700/40 text-slate-400 rounded-lg hover:text-slate-200 hover:bg-slate-700/40 hover:border-slate-600/40 transition-all">
            退出大屏
          </button>
        </div>
      </div>

      {/* ═══════ Main Grid ═══════ */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* ═══════ Left Column ═══════ */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-2">
            {(stats as any).map((s: any, i: number) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`bs-stat-card ${s.bar} bs-data-flow hover-lift animate-fade-in-up`} style={{ animationDelay: `${i * 0.06}s`, padding: '0.875rem 1rem' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}12` }}>
                      <Icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <span className="text-[10px] text-slate-400">{s.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-xl md:text-2xl font-extrabold bs-text-gradient tracking-tight" style={{ color: s.color }}>{s.value}</span>
                    <span className="text-[10px] text-slate-500">{s.unit}</span>
                  </div>
                  <div className="text-[9px] text-slate-500">{s.sub}</div>
                </div>
              );
            })}
          </div>

          {/* 子系统状态 */}
          <div className="bs-tech-panel flex-1 flex flex-col p-3 bs-corner-accent">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1 h-3.5 rounded-sm bg-gradient-to-b from-blue-500 to-cyan-400" />
              <span className="text-xs font-semibold text-slate-200 tracking-wide">子系统状态</span>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-700/50 to-transparent ml-2" />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5">
              {systems.map((sys: any, i: number) => {
                const SysIcon = sys.icon || Activity;
                const isActive = pulseIndex === i;
                return (
                  <div key={sys.name} className={`bs-subsystem-item flex items-center gap-2 p-2 ${isActive ? 'active' : ''}`}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${sys.color}12` }}>
                      <SysIcon className="w-3.5 h-3.5" style={{ color: sys.color }} />
                    </div>
                    <span className="text-[11px] text-slate-300 flex-1 truncate">{sys.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${sys.status === '正常' ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/20' : 'text-amber-400 bg-amber-500/8 border-amber-500/20'}`}>{sys.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════ Center Column ═══════ */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          {/* 地图面板 */}
          <div className="h-[220px] md:h-[240px] flex-shrink-0">
            <ScreenMapPanel />
          </div>

          {/* 今日告警时序 */}
          <div className="bs-tech-panel p-3 bs-corner-accent bs-data-flow flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="bs-chart-title">
                <span className="text-xs font-semibold text-slate-200">今日告警时序</span>
              </div>
              <span className="text-[9px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">24小时</span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.35}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} width={18} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="alarm" name="火警" stroke="#ef4444" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="fault" name="故障" stroke="#f59e0b" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 单位告警排行 */}
          <div className="bs-tech-panel p-3 bs-corner-accent bs-data-flow flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="bs-chart-title">
                <span className="text-xs font-semibold text-slate-200">单位告警排行</span>
              </div>
              <span className="text-[9px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">本月</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitAlarmData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="告警数" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ═══════ Right Column ═══════ */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* 设备类型分布 */}
          <div className="bs-tech-panel p-3 bs-corner-accent bs-data-flow">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1 h-3.5 rounded-sm bg-gradient-to-b from-blue-500 to-cyan-400" />
              <span className="text-xs font-semibold text-slate-200">设备类型分布</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={deviceTypeDist} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={3} dataKey="value">
                  {deviceTypeDist.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} stroke="rgba(15,23,42,0.8)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} iconSize={6} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 最近告警 */}
          <div className="bs-tech-panel flex-1 flex flex-col p-3 bs-corner-accent min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3.5 rounded-sm bg-gradient-to-b from-red-500 to-orange-400" />
                <span className="text-xs font-semibold text-slate-200">最近告警</span>
              </div>
              <span className="text-[9px] text-red-400 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                实时
              </span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5 pr-0.5">
              {recentAlarms.map((a: any, i: number) => {
                const cfg = levelConfig[a.level] || levelConfig['一般'];
                return (
                  <div key={i} className={`flex items-center gap-2 p-2 ${cfg.cls}`}>
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: typeColors[a.type] || '#64748b' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-300 font-medium truncate">{a.device}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-slate-500 truncate">{a.unit}</span>
                        <span className="text-[9px] text-slate-600 flex-shrink-0">{a.time}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${cfg.text} ${cfg.bg} border-current/20`}>{a.level}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 底部指标 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bs-metric-card text-center p-2.5">
              <div className="text-base font-bold bs-text-gradient-green">93.2%</div>
              <div className="text-[9px] text-slate-500 mt-0.5">告警处理率</div>
            </div>
            <div className="bs-metric-card text-center p-2.5">
              <div className="text-base font-bold bs-text-gradient-blue">3.2min</div>
              <div className="text-[9px] text-slate-500 mt-0.5">平均响应</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </DataContainer>
  );
}
