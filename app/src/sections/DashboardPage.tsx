import DataContainer from '@/components/DataContainer';
import StatCard from '@/components/StatCard';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { useNavigate } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboardService } from '@/api/services';
import { alarmService } from '@/api/services';
import {
  Building2, Cpu, Bell, Flame, AlertTriangle,
  Wifi, WifiOff, TrendingUp, MapPin, Activity,
  Droplets, Zap, Wind, Clock,
  XCircle, LayoutDashboard, ShieldCheck
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip
} from 'recharts';

interface DashboardStats {
  unitCount: number;
  deviceCount: number;
  onlineDeviceCount: number;
  alarmCount24h: number;
  unhandledAlarmCount: number;
  controlRoomCount: number;
  pendingWorkOrderCount: number;
  deviceOnlineRate: string;
}

interface RecentAlarm {
  id: string;
  alarm_no: string;
  alarm_type: number;
  alarm_level: number;
  device_name: string;
  unit_name: string;
  location: string;
  alarm_desc: string;
  status: number;
  created_at: string;
}

interface UnitRankItem {
  name: string;
  online: number;
  alarm: number;
  fault: number;
  status: string;
}

interface SubsystemStat {
  name: string;
  total: number;
  online: number;
  alarm: number;
}

/* ---------- Utility: animated number ---------- */
function useAnimatedNumber(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);
  const toRef = useRef<number>(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = display;
    toRef.current = target;
    startRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(fromRef.current + (toRef.current - fromRef.current) * easeOutQuart);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

/* ---------- Mini sparkline data ---------- */
const sparkDataMap: Record<string, number[]> = {
  联网单位: [12, 15, 13, 18, 20, 22, 25, 24, 28, 30, 32, 35],
  设备总数: [8000, 8200, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000, 12500, 12860],
  在线设备: [7800, 8000, 8300, 8800, 9200, 9800, 10200, 10800, 11200, 11800, 12200, 12412],
  今日火警: [5, 8, 3, 6, 12, 9, 15, 11, 8, 10, 7, 5],
  今日故障: [20, 22, 18, 25, 30, 28, 35, 32, 30, 28, 25, 12],
  隐患数量: [30, 28, 25, 22, 20, 18, 15, 12, 10, 8, 5, 3],
};

/* ---------- Helper components ---------- */
function AnimatedStatCard({
  label, value, change, up, Icon, color, className = '', delay = 0,
}: {
  label: string;
  value: number;
  change: string;
  up: boolean;
  Icon: typeof Building2;
  color: Parameters<typeof StatCard>[0]['color'];
  className?: string;
  delay?: number;
}) {
  const animated = useAnimatedNumber(typeof value === 'number' ? value : 0);
  const data = sparkDataMap[label] || [0, 0, 0, 0, 0, 0];
  const sparkColor =
    color === 'red' ? '#f87171' :
    color === 'yellow' ? '#fbbf24' :
    color === 'emerald' ? '#34d399' :
    color === 'orange' ? '#fb923c' :
    '#60a5fa';

  return (
    <div
      className={`animate-fade-in-up relative group ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <StatCard
        label={label}
        value={animated.toLocaleString()}
        change={change}
        up={up}
        Icon={Icon}
        color={color}
        className="stat-card-v2 relative overflow-hidden"
      />
      {/* Mini sparkline overlay */}
      <div className="absolute bottom-1.5 right-1.5 opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none">
        <div className="w-16 h-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.map((v, i) => ({ i, v }))}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#spark-${label})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const alarmTypeIcon = (type: number) => {
  switch (type) {
    case 1: return <Flame className="w-3 h-3 text-red-400" />;
    case 2: return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
    default: return <Bell className="w-3 h-3 text-blue-400" />;
  }
};

const alarmTypeLabel = (type: number) => {
  switch (type) {
    case 1: return <Badge className="text-[8px] bg-red-500/20 text-red-400 border-red-500/30 px-1">火警</Badge>;
    case 2: return <Badge className="text-[8px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-1">故障</Badge>;
    default: return <Badge className="text-[8px] bg-blue-500/20 text-blue-400 border-blue-500/30 px-1">预警</Badge>;
  }
};

const alarmLevelMeta = (level: number) => {
  switch (level) {
    case 1: return { color: 'red', label: '紧急', border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', indicator: 'row-indicator-red' };
    case 2: return { color: 'orange', label: '严重', border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-400', indicator: 'row-indicator-yellow' };
    case 3: return { color: 'yellow', label: '一般', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-400', indicator: 'row-indicator-yellow' };
    default: return { color: 'blue', label: '提示', border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', indicator: 'row-indicator-blue' };
  }
};

const subsystemIcons: Record<string, { icon: typeof Droplets; color: string; bg: string; border: string }> = {
  '消防给水': { icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  '电气火灾': { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  '防排烟': { icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
};

/* ---------- Main component ---------- */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAlarms, setRecentAlarms] = useState<RecentAlarm[]>([]);
  const [unitRank, setUnitRank] = useState<UnitRankItem[]>([]);
  const [subsystems, setSubsystems] = useState<SubsystemStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /* Real-time clock */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, alarmsRes, rankRes, subRes] = await Promise.all([
        dashboardService.getStats(),
        alarmService.recent(),
        dashboardService.getUnitRank(),
        dashboardService.getSubsystems(),
      ]);
      if (statsRes.code === 200) setStats(statsRes.data);
      if (alarmsRes.code === 200) setRecentAlarms((alarmsRes.data || []) as any);
      if (rankRes.code === 200) setUnitRank(rankRes.data || []);
      if (subRes.code === 200) setSubsystems(subRes.data || []);
    } catch (e) {
      console.error('Dashboard load error', e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  };

  useVisibilityPolling(load, 30000);

  const headerStats = useMemo(() => {
    if (!stats) return [];
    return [
      { label: '联网单位', value: stats.unitCount, change: '+3', up: true, Icon: Building2, color: 'blue' as const },
      { label: '设备总数', value: stats.deviceCount, change: '+128', up: true, Icon: Cpu, color: 'emerald' as const },
      { label: '在线设备', value: stats.onlineDeviceCount, change: '+95', up: true, Icon: Wifi, color: 'emerald' as const },
      { label: '今日火警', value: stats.alarmCount24h, change: '-5', up: false, Icon: Flame, color: 'red' as const },
      { label: '今日故障', value: stats.unhandledAlarmCount, change: '+12', up: true, Icon: AlertTriangle, color: 'yellow' as const },
      { label: '隐患数量', value: stats.pendingWorkOrderCount, change: '-8', up: false, Icon: XCircle, color: 'orange' as const },
    ];
  }, [stats]);

  const trendData = [
    { hour: '00:00', alarm: 2 }, { hour: '02:00', alarm: 1 },
    { hour: '04:00', alarm: 0 }, { hour: '06:00', alarm: 1 },
    { hour: '08:00', alarm: 4 }, { hour: '10:00', alarm: 8 },
    { hour: '12:00', alarm: 6 }, { hour: '14:00', alarm: 3 },
    { hour: '16:00', alarm: 5 }, { hour: '18:00', alarm: 7 },
    { hour: '20:00', alarm: 4 }, { hour: '22:00', alarm: 2 },
  ];

  const unitCount = stats?.unitCount ?? 156;
  const onlineCount = stats?.onlineDeviceCount ?? 12412;
  const offlineCount = (stats?.deviceCount ?? 12860) - onlineCount;

  const mapDots = useMemo(() => Array.from({ length: 12 }).map((_, i) => {
    const x = 15 + (i % 4) * 22 + ((i * 3) % 8);
    const y = 20 + Math.floor(i / 4) * 28 + ((i * 5) % 8);
    const hasAlarm = i < 3;
    return { x, y, hasAlarm, label: ['万达', '石化', '二院', '中心', '师大', '靖煤', '红星', '新区', '赋安', '新致远', '专精特', '其他'][i] };
  }), []);

  const totalAlarms = trendData.reduce((a, b) => a + b.alarm, 0);

  return (
    <DataContainer loading={loading} error={error} data={stats} onRetry={load} emptyText="暂无数据">
      <div className="h-[calc(100vh-7rem)] flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">

        {/* ====== Page Header ====== */}
        <div className="flex items-center gap-3 flex-shrink-0 glass rounded-xl px-4 py-3 animate-fade-in-up relative overflow-hidden scan-line">
          {/* Decorative tech lines */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 ring-1 ring-blue-500/10 relative">
            <LayoutDashboard className="w-5 h-5 text-blue-400" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-75" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-subhead font-bold text-slate-100 leading-tight glow-text-blue">数据总览</h2>
              <div className="hidden sm:flex items-center gap-1">
                <div className="h-[1px] w-8 bg-gradient-to-r from-blue-500/50 to-transparent" />
                <div className="h-[1px] w-4 bg-gradient-to-r from-cyan-500/40 to-transparent" />
              </div>
            </div>
            <p className="text-caption text-slate-500">实时监控与态势感知</p>
          </div>

          {/* System health LED */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/30">
            <span className="text-[10px] text-slate-400 mr-1">系统状态</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 led-pulse-green" />
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">正常</span>
          </div>

          {/* Real-time clock */}
          <div className="hidden sm:flex flex-col items-end px-3 py-1 rounded-lg bg-slate-800/30 border border-slate-700/20">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs font-mono font-bold text-slate-200 tabular-nums">{timeStr}</span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono">{dateStr}</span>
          </div>

          {stats && stats.alarmCount24h > 0 && (
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 animate-pulse-glow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
              </span>
              <span className="text-caption text-red-400 font-medium">{stats.alarmCount24h} 条新火警</span>
            </div>
          )}
          {stats && stats.alarmCount24h === 0 && (
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-caption text-emerald-400 font-medium">运行正常</span>
            </div>
          )}
        </div>

        {/* ====== Header Stats ====== */}
        <div className="grid grid-cols-3 xl:grid-cols-6 gap-3 flex-shrink-0">
          {headerStats.map((s, i) => (
            <AnimatedStatCard
              key={i}
              label={s.label}
              value={typeof s.value === 'number' ? s.value : 0}
              change={s.change}
              up={s.up}
              Icon={s.Icon}
              color={s.color}
              className={`stagger-${i + 1}`}
              delay={i * 80}
            />
          ))}
        </div>

        {/* ====== Middle Row: GIS Map + Recent Alarms ====== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 flex-shrink-0">

          {/* GIS Map */}
          <div className="xl:col-span-2 rounded-xl border border-slate-700/30 bg-slate-800/40 backdrop-blur-sm overflow-hidden flex flex-col fire-card-v2 relative group">
            {/* Tech corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/30 rounded-tl-lg z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500/30 rounded-tr-lg z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500/30 rounded-bl-lg z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/30 rounded-br-lg z-10 pointer-events-none" />

            <div className="p-2.5 border-b border-slate-700/30 flex items-center justify-between relative">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-xs font-semibold text-slate-200">GIS地图监控</span>
                <Badge variant="outline" className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{unitCount}个点位</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <span className="relative flex h-1.5 w-1.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  {onlineCount}
                </Badge>
                <Badge variant="outline" className="text-[8px] bg-red-500/20 text-red-400 border-red-500/30">
                  <WifiOff className="w-2 h-2 inline mr-0.5" />{offlineCount}
                </Badge>
              </div>
            </div>

            <div className="h-52 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 relative flex items-center justify-center overflow-hidden">
              {/* Grid background */}
              <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none">
                <defs><pattern id="mapgrid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0 L0 0 0 30" fill="none" stroke="white" strokeWidth="0.3" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#mapgrid)" />
              </svg>
              <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
                <line x1="20%" y1="0" x2="20%" y2="100%" stroke="white" strokeWidth="0.5" />
                <line x1="60%" y1="0" x2="60%" y2="100%" stroke="white" strokeWidth="0.5" />
                <line x1="0" y1="30%" x2="100%" y2="30%" stroke="white" strokeWidth="0.5" />
                <line x1="0" y1="70%" x2="100%" y2="70%" stroke="white" strokeWidth="0.5" />
              </svg>

              {/* Map connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                {mapDots.slice(0, 6).map((dot, i) => {
                  const next = mapDots[i + 1] || mapDots[0];
                  return (
                    <line
                      key={i}
                      x1={`${dot.x}%`}
                      y1={`${dot.y}%`}
                      x2={`${next.x}%`}
                      y2={`${next.y}%`}
                      stroke="rgba(59,130,246,0.15)"
                      strokeWidth="0.5"
                      strokeDasharray="4 4"
                    />
                  );
                })}
              </svg>

              {/* Map markers */}
              {mapDots.map((dot, i) => (
                <div key={i} className="absolute flex flex-col items-center animate-scale-in" style={{ left: `${dot.x}%`, top: `${dot.y}%`, animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
                  <div className="relative">
                    {/* Pulse ring */}
                    <span className={`absolute inset-0 rounded-full animate-ping opacity-40 ${dot.hasAlarm ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ transform: 'scale(1.8)' }} />
                    <span className={`absolute inset-0 rounded-full animate-ping opacity-20 ${dot.hasAlarm ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ transform: 'scale(2.5)', animationDelay: '0.5s' }} />
                    <div className={`relative w-3 h-3 rounded-full ${dot.hasAlarm ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'} border-2 border-slate-800`} />
                  </div>
                  <span className="text-[6px] text-slate-400 mt-1 whitespace-nowrap bg-slate-900/60 px-1 rounded">{dot.label}</span>
                </div>
              ))}

              {/* Location label */}
              <div className="absolute bottom-2 left-2 text-[8px] text-slate-600">甘肃省兰州市</div>

              {/* Map legend */}
              <div className="absolute bottom-2 right-2 flex items-center gap-3 bg-slate-900/60 backdrop-blur-sm rounded-md px-2 py-1 border border-slate-700/20">
                <span className="flex items-center gap-1 text-[8px] text-slate-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  正常
                </span>
                <span className="flex items-center gap-1 text-[8px] text-slate-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
                  </span>
                  报警
                </span>
                <span className="flex items-center gap-1 text-[8px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  离线
                </span>
              </div>
            </div>
          </div>

          {/* Recent Alarms */}
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 backdrop-blur-sm overflow-hidden flex flex-col fire-card-v2 relative">
            <div className="p-2.5 border-b border-slate-700/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-red-400" />
                </div>
                <span className="text-xs font-semibold text-slate-200">最近报警</span>
                <Badge variant="outline" className="text-[8px] bg-red-500/20 text-red-400 border-red-500/30">{recentAlarms.length}条</Badge>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[9px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-0 px-2 rounded-md transition-all" onClick={() => navigate('/alarm/center')}>查看全部</Button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
              {recentAlarms.map((a, i) => {
                const meta = alarmLevelMeta(a.alarm_level);
                const isUnread = a.status === 0;
                return (
                  <div
                    key={i}
                    className={`relative p-2 rounded-lg border ${meta.border} ${meta.bg} hover:bg-slate-700/40 transition-all duration-200 cursor-pointer hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-500/5 row-indicator ${meta.indicator} ${isUnread ? 'animate-border-flash' : ''}`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[5px] w-[6px] h-[6px] rounded-full bg-slate-600 border border-slate-800" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {alarmTypeIcon(a.alarm_type)}
                        <span className="text-[8px] text-slate-500 font-mono">{a.alarm_no?.slice(-6)}</span>
                        {isUnread && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {alarmTypeLabel(a.alarm_type)}
                        <span className={`text-[8px] px-1 py-0.5 rounded ${meta.bg} ${meta.text} border ${meta.border}`}>{meta.label}</span>
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-300 mt-1 truncate">{a.device_name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[8px] text-slate-500">{a.unit_name}</span>
                      <span className="text-[8px] text-slate-500 font-mono">{a.created_at?.slice(11, 19)}</span>
                    </div>
                  </div>
                );
              })}
              {recentAlarms.length === 0 && <div className="text-center py-8 text-xs text-slate-600">暂无报警数据</div>}
            </div>
          </div>
        </div>

        {/* ====== Bottom Row: Subsystem + Unit Rank ====== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 flex-shrink-0">

          {/* Subsystem Stats */}
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 backdrop-blur-sm overflow-hidden flex flex-col fire-card-v2 animate-fade-in-up" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
            <div className="p-2.5 border-b border-slate-700/30 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-slate-200">子系统状态</span>
            </div>
            <div className="p-2.5 space-y-2">
              {subsystems.map((s, i) => {
                const cfg = subsystemIcons[s.name] || { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
                const Icon = cfg.icon;
                const rate = s.total > 0 ? (s.online / s.total) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/30 transition-all duration-200 hover:scale-[1.01] animate-fade-in-up" style={{ animationDelay: `${200 + i * 60}ms`, animationFillMode: 'both' }}>
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 border ${cfg.border}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-200 font-medium">{s.name}</span>
                        <span className="text-[9px] text-slate-500">{s.online}/{s.total}在线</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 progress-fire-fill"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        {s.alarm > 0 && (
                          <span className="text-[8px] text-red-400 flex items-center gap-0.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
                            </span>
                            {s.alarm}条报警
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {subsystems.length === 0 && <div className="text-center py-4 text-xs text-slate-600">暂无子系统数据</div>}
            </div>
          </div>

          {/* Unit Online Rate */}
          <div className="xl:col-span-2 rounded-xl border border-slate-700/30 bg-slate-800/40 backdrop-blur-sm overflow-hidden flex flex-col fire-card-v2 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="p-2.5 border-b border-slate-700/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-slate-200">单位在线率排名</span>
              </div>
              <span className="text-[10px] text-slate-500">{unitRank.length} 家单位</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
              {unitRank.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/30 transition-all duration-200 hover:scale-[1.01] animate-fade-in-up" style={{ animationDelay: `${250 + i * 40}ms`, animationFillMode: 'both' }}>
                  <span className={`text-[10px] w-5 h-5 rounded-md flex items-center justify-center font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                    i === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/20' :
                    i === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' :
                    'text-slate-500'
                  }`}>{i + 1}</span>
                  <span className="text-xs text-slate-200 flex-1 truncate font-medium">{u.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 text-red-400" />
                      <span className="text-[9px] text-red-400 font-medium">{u.alarm}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5 text-yellow-400" />
                      <span className="text-[9px] text-yellow-400 font-medium">{u.fault}</span>
                    </div>
                  </div>
                  <div className="w-28 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 progress-fire-fill ${
                          u.online >= 99 ? 'from-emerald-600 to-emerald-400' :
                          u.online >= 97 ? 'from-blue-600 to-blue-400' :
                          'from-yellow-600 to-yellow-400'
                        }`}
                        style={{ width: `${u.online}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 w-8 text-right font-mono font-medium">{u.online}%</span>
                  </div>
                </div>
              ))}
              {unitRank.length === 0 && <div className="text-center py-4 text-xs text-slate-600">暂无单位数据</div>}
            </div>
          </div>
        </div>

        {/* ====== Trend Chart (Recharts) ====== */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 backdrop-blur-sm overflow-hidden flex-shrink-0 fire-card-v2 animate-fade-in-up relative" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
          <div className="p-2.5 border-b border-slate-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-slate-200">今日报警趋势</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500">总计</span>
              <span className="text-xs font-bold text-slate-100">{totalAlarms}</span>
            </div>
          </div>
          <div className="p-3 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    borderRadius: '0.5rem',
                    fontSize: '10px',
                    color: '#e2e8f0',
                  }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                  itemStyle={{ color: '#60a5fa', fontSize: '10px' }}
                  formatter={(value: number) => [`${value} 次`, '报警']}
                />
                <Area
                  type="monotone"
                  dataKey="alarm"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#trendGradient)"
                  dot={{ r: 2, fill: '#60a5fa', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: '#93c5fd', stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DataContainer>
  );
}
