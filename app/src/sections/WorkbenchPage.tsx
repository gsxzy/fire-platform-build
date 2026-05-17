import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, Bell, Flame, AlertTriangle, Wrench, ClipboardList,
  Building2, Cpu, Shield, BookOpen, PhoneCall,
  Activity, BarChart3, Wifi, TrendingUp, TrendingDown,
  Zap, User, Phone, Sun, Thermometer, Droplets,
  CheckSquare, Square
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';
import { dashboardService } from '@/api/services';
import DataContainer from '@/components/DataContainer';

/* ---------- 默认数据 ---------- */
const DEFAULT_ALARM_TREND: { day: string; fire: number; fault: number; warn: number }[] = [];

const DEFAULT_DEVICE_ONLINE: { name: string; total: number; online: number }[] = [];

const DEFAULT_UNIT_STATUS: { name: string; value: number; color: string }[] = [];

const DEFAULT_WEEKLY_STATS: { week: string; alarms: number; handled: number }[] = [];

const DEFAULT_SHORTCUTS: any[] = [];

const DEFAULT_TODOS: any[] = [];

interface StatItem {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend: string;
  up: boolean;
}

const STAT_ITEMS: StatItem[] = [
  { label: '今日火警', value: 0, icon: Flame, color: 'red', trend: '0', up: false },
  { label: '今日故障', value: 0, icon: AlertTriangle, color: 'yellow', trend: '0', up: false },
  { label: '待确认告警', value: 0, icon: Bell, color: 'orange', trend: '0', up: false },
  { label: '维保工单', value: 0, icon: Wrench, color: 'emerald', trend: '0', up: false },
  { label: '巡检任务', value: 0, icon: ClipboardList, color: 'cyan', trend: '0', up: false },
  { label: '待整改隐患', value: 0, icon: Shield, color: 'yellow', trend: '0', up: false },
  { label: '联网单位', value: 0, icon: Building2, color: 'blue', trend: '0', up: false },
  { label: '在线设备', value: 0, icon: Cpu, color: 'emerald', trend: '0', up: false },
];

/* ---------- Sparkline 数据 ---------- */
const sparkDataMap: Record<string, number[]> = {};

/* ---------- 颜色映射 ---------- */
const colorMap: Record<string, { text: string; bg: string; border: string; iconColor: string }> = {
  red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', iconColor: 'text-red-400' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', iconColor: 'text-yellow-400' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', iconColor: 'text-orange-400' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', iconColor: 'text-emerald-400' },
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', iconColor: 'text-cyan-400' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', iconColor: 'text-blue-400' },
};

/* ---------- 工具：数字动画 ---------- */
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

/* ---------- 组件：自定义 Tooltip ---------- */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/60 rounded-lg p-2.5 shadow-2xl backdrop-blur-sm">
        <p className="text-[10px] text-slate-300 font-medium mb-1.5">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="text-slate-200 font-medium">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/* ---------- 组件：带动画的统计卡片 ---------- */
function AnimatedStatCard({
  s, index
}: {
  s: StatItem;
  index: number;
}) {
  const Icon = s.icon;
  const c = colorMap[s.color];
  const isUrgent = s.label === '今日火警' || s.label === '待确认告警';
  const numericValue = typeof s.value === 'string' ? parseFloat(s.value) : s.value;
  const animated = useAnimatedNumber(numericValue);
  const displayValue = typeof s.value === 'string' && s.value.includes('%')
    ? `${animated.toFixed(1)}%`
    : animated.toLocaleString();
  const sparkData = sparkDataMap[s.label] || [0, 0, 0, 0, 0, 0, 0];
  const sparkColor =
    s.color === 'red' ? '#f87171' :
    s.color === 'yellow' ? '#fbbf24' :
    s.color === 'emerald' ? '#34d399' :
    s.color === 'orange' ? '#fb923c' :
    s.color === 'cyan' ? '#22d3ee' :
    '#60a5fa';

  return (
    <div
      className={`animate-fade-in-up relative group ${isUrgent ? 'animate-pulse-glow' : ''}`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div className={`stat-card-v2 ${c.border} ${c.bg} card-shine relative overflow-hidden`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium">{s.label}</span>
          <div className={`${c.iconColor}`}><Icon className="w-3.5 h-3.5" /></div>
        </div>
        <div className="flex items-baseline gap-1 relative z-10">
          <span className={`text-lg font-bold ${c.text} tabular-nums`}>{displayValue}</span>
          {s.trend !== '0' && (
            <span className={`text-[8px] flex items-center ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>
              {s.up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {s.trend}
            </span>
          )}
        </div>
        {/* Mini sparkline */}
        <div className="absolute bottom-1 right-1 opacity-20 group-hover:opacity-50 transition-opacity pointer-events-none">
          <div className="w-14 h-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData.map((v, idx) => ({ idx, v }))}>
                <defs>
                  <linearGradient id={`spark-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.2}
                  fill={`url(#spark-${index})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 主组件 ---------- */
export default function WorkbenchPage() {
  const navigate = useNavigate();
  const [alarmTrend, setAlarmTrend] = useState(DEFAULT_ALARM_TREND);
  const [deviceOnline, setDeviceOnline] = useState(DEFAULT_DEVICE_ONLINE);
  const [unitStatus, setUnitStatus] = useState(DEFAULT_UNIT_STATUS);
  const [weeklyStats, setWeeklyStats] = useState(DEFAULT_WEEKLY_STATS);
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [todos, setTodos] = useState(DEFAULT_TODOS);
  const [statRows, setStatRows] = useState(STAT_ITEMS);
  const [dutyInfo, setDutyInfo] = useState<{ name: string; phone: string }>({ name: '—', phone: '' });
  const [monthSummary, setMonthSummary] = useState({ alarmTotal: 0, handled: 0, handleRate: '0' });
  const [inspectionMonthCount, setInspectionMonthCount] = useState(0);
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = (await dashboardService.workbench()) as Record<string, unknown>;
      const hasTrend =
        Array.isArray(raw.alarmTrend as unknown[]) ||
        (raw.alarm && typeof raw.alarm === 'object' && Array.isArray((raw.alarm as { trend?: unknown }).trend));
      const data: Record<string, unknown> = (
        raw && typeof raw === 'object' && hasTrend
          ? raw
          : raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object'
            ? raw.data
            : {}
      ) as Record<string, unknown>;
      if (Array.isArray(data.alarmTrend) && data.alarmTrend.length > 0) setAlarmTrend(data.alarmTrend);
      if (Array.isArray(data.deviceOnline) && data.deviceOnline.length > 0) setDeviceOnline(data.deviceOnline);
      if (Array.isArray(data.unitStatus) && data.unitStatus.length > 0) setUnitStatus(data.unitStatus);
      if (Array.isArray(data.weeklyStats) && data.weeklyStats.length > 0) setWeeklyStats(data.weeklyStats);
      if (Array.isArray(data.shortcuts) && data.shortcuts.length > 0) {
        const iconMap: Record<string, typeof Bell> = {
          Bell, PhoneCall, Cpu, Wrench, ClipboardList, Shield, LayoutDashboard, BookOpen,
        };
        const mapped = data.shortcuts.map((s: any) => {
          const Ico = typeof s.icon === 'string' ? iconMap[s.icon] : s.icon;
          if (!Ico) return null;
          return { ...s, icon: Ico };
        }).filter(Boolean) as typeof DEFAULT_SHORTCUTS;
        if (mapped.length > 0) setShortcuts(mapped);
      }
      if (Array.isArray(data.todos)) setTodos(data.todos);

      const alarmObj = data.alarm as Record<string, unknown>;
      if (alarmObj && Array.isArray(alarmObj.trend) && alarmObj.trend.length > 0) setAlarmTrend(alarmObj.trend as typeof DEFAULT_ALARM_TREND);
      const deviceObj = data.device as Record<string, unknown>;
      if (deviceObj && Array.isArray(deviceObj.byType) && (deviceObj.byType as unknown[]).length > 0) {
        setDeviceOnline(deviceObj.byType as typeof DEFAULT_DEVICE_ONLINE);
      } else if (deviceObj && Array.isArray(deviceObj.online) && (deviceObj.online as unknown[]).length > 0) {
        setDeviceOnline(deviceObj.online as typeof DEFAULT_DEVICE_ONLINE);
      }
      const workOrderObj = data.workOrder as Record<string, unknown>;
      if (workOrderObj) {
        if (Array.isArray(workOrderObj.weeklyStats) && workOrderObj.weeklyStats.length > 0) setWeeklyStats(workOrderObj.weeklyStats as typeof DEFAULT_WEEKLY_STATS);
      }

      if (data.stats && typeof data.stats === 'object') {
        const st = data.stats as Record<string, unknown>;
        setStatRows(
          STAT_ITEMS.map((item) => {
            if (item.label === '今日火警') return { ...item, value: Number(st.todayFire ?? 0) };
            if (item.label === '今日故障') return { ...item, value: Number(st.todayFault ?? 0) };
            if (item.label === '待确认告警') return { ...item, value: Number(st.alarmPending ?? 0) };
            if (item.label === '维保工单') return { ...item, value: Number(st.workOrderPending ?? 0) };
            if (item.label === '巡检任务') return { ...item, value: Number(st.patrolToday ?? 0) };
            if (item.label === '待整改隐患') return { ...item, value: Number(st.hazardPending ?? 0) };
            if (item.label === '联网单位') return { ...item, value: Number(st.unitTotal ?? 0) };
            if (item.label === '在线设备') return { ...item, value: Number(st.deviceActiveOnline ?? st.deviceOnline ?? 0) };
            return item;
          })
        );
      }

      if (data.duty && typeof data.duty === 'object') {
        const d = data.duty as { name?: string; phone?: string };
        setDutyInfo({ name: d.name || '—', phone: d.phone || '' });
      }

      if (data.summaryMonth && typeof data.summaryMonth === 'object') {
        const m = data.summaryMonth as { alarmTotal?: number; handled?: number; handleRate?: string };
        setMonthSummary({
          alarmTotal: Number(m.alarmTotal ?? 0),
          handled: Number(m.handled ?? 0),
          handleRate: String(m.handleRate ?? '0'),
        });
      }

      if (data.inspection && typeof data.inspection === 'object') {
        setInspectionMonthCount(Number((data.inspection as { month?: number }).month ?? 0));
      }

      setChecked([]);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useVisibilityPolling(loadData, 30000);

  const [checked, setChecked] = useState<number[]>([6]);
  const toggleCheck = (id: number) => setChecked(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const pending = todos.filter(t => !checked.includes(t.id));

  /* Todo progress */
  const doneCount = checked.length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  /* Device online donut data */
  const devicePieData = useMemo(() => {
    const total = deviceOnline.reduce((a, b) => a + b.total, 0);
    const online = deviceOnline.reduce((a, b) => a + b.online, 0);
    return [
      { name: '在线', value: online, color: '#10b981' },
      { name: '离线', value: Math.max(0, total - online), color: '#334155' },
    ];
  }, [deviceOnline]);

  const totalOnlineRate = useMemo(() => {
    const total = deviceOnline.reduce((a, b) => a + b.total, 0);
    const online = deviceOnline.reduce((a, b) => a + b.online, 0);
    return total > 0 ? Math.round((online / total) * 1000) / 10 : 0;
  }, [deviceOnline]);

  /* Active unit index for pie hover highlight */
  const [activeUnitIndex, setActiveUnitIndex] = useState<number | null>(null);

  return (
    <DataContainer loading={loading} error={error} data={statRows} onRetry={loadData} emptyText="暂无数据">
      <div className="p-4 space-y-4 h-full overflow-y-auto scrollbar-thin">

        {/* ====== Header ====== */}
        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up relative overflow-hidden scan-line gradient-border">
          {/* Decorative lines */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 ring-1 ring-blue-500/10 relative">
              <LayoutDashboard className="w-5 h-5 text-blue-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-75" />
            </div>
            <div>
              <h2 className="text-subhead font-bold text-slate-100 leading-tight glow-text-blue">工作台</h2>
              <p className="text-[10px] text-slate-500">智慧消防指挥调度中心</p>
            </div>
          </div>

          {/* Duty + Weather */}
          <div className="hidden md:flex items-center gap-4 relative z-10">
            {/* Duty info */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/30 hover-lift">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">值班人员（排班）</div>
                <div className="text-[11px] text-slate-200 font-medium flex items-center gap-1">
                  {dutyInfo.name}
                  {dutyInfo.phone ? (
                    <span className="flex items-center gap-0.5 text-[9px] text-emerald-400">
                      <Phone className="w-2.5 h-2.5" />{dutyInfo.phone}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            {/* Weather placeholder */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/30 hover-lift">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">兰州 · 晴</div>
                <div className="text-[11px] text-slate-200 font-medium flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><Thermometer className="w-2.5 h-2.5 text-red-400" />18°C</span>
                  <span className="flex items-center gap-0.5"><Droplets className="w-2.5 h-2.5 text-blue-400" />32%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Clock + Status */}
          <div className="flex items-center gap-2 relative z-10">
            <div className="hidden sm:flex flex-col items-end px-3 py-1 rounded-lg bg-slate-800/30 border border-slate-700/20">
              <span className="text-xs font-mono font-bold text-slate-200 tabular-nums">{timeStr}</span>
              <span className="text-[9px] text-slate-500 font-mono">{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 animate-pulse-glow">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
              </span>
              <span className="text-[10px] text-red-400 font-medium">{pending.filter(t => t.priority === 'urgent').length}条紧急</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="text-[10px] text-blue-400 font-medium">{pending.length}条待办</span>
            </div>
          </div>
        </div>

        {/* ====== Stats Row ====== */}
        <div className="grid grid-cols-4 xl:grid-cols-8 gap-3">
          {statRows.map((s, i) => (
            <AnimatedStatCard key={i} s={s} index={i} />
          ))}
        </div>

        {/* ====== Charts Row ====== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          {/* Alarm Trend */}
          <div className="fire-card-v2 p-3 transition-all hover:border-slate-600/40 relative group animate-fade-in-up" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-slate-200">本周告警趋势</span>
              </div>
              <span className="text-[9px] text-slate-500">近7天</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={alarmTrend}>
                <defs>
                  <linearGradient id="gradFire" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradFault" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradWarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={20} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="fire" name="火警" stroke="#ef4444" fill="url(#gradFire)" strokeWidth={2}
                  dot={{ r: 2.5, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 4.5, fill: '#fca5a5', stroke: '#ef4444', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="fault" name="故障" stroke="#f59e0b" fill="url(#gradFault)" strokeWidth={2}
                  dot={{ r: 2.5, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 4.5, fill: '#fcd34d', stroke: '#f59e0b', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="warn" name="预警" stroke="#3b82f6" fill="url(#gradWarn)" strokeWidth={2}
                  dot={{ r: 2.5, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 4.5, fill: '#93c5fd', stroke: '#3b82f6', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Device Online — Donut */}
          <div className="fire-card-v2 p-3 transition-all hover:border-slate-600/40 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200">设备在线率</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span className="text-[9px] text-emerald-400 font-medium">{totalOnlineRate}% 在线率</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={devicePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      animationDuration={800}
                      animationBegin={200}
                    >
                      {devicePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-slate-100 tabular-nums">{totalOnlineRate}%</span>
                  <span className="text-[8px] text-slate-500">总在线率</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {deviceOnline.map((d, i) => {
                  const pct = d.total > 0 ? Math.round((d.online / d.total) * 100) : 0;
                  return (
                    <div key={i} className="group/item">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">{d.name}</span>
                        <span className="text-[9px] text-slate-500">{d.online}/{d.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 progress-fire-fill"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 98 ? '#10b981' : pct >= 90 ? '#3b82f6' : '#f59e0b',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Unit Distribution */}
          <div className="fire-card-v2 p-3 transition-all hover:border-slate-600/40 animate-fade-in-up" style={{ animationDelay: '0.35s', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-slate-200">单位分布</span>
              </div>
              <span className="text-[9px] text-slate-500">共{unitStatus.reduce((a, b) => a + b.value, 0)}家</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={unitStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={800}
                  animationBegin={200}
                  onMouseEnter={(_, idx) => setActiveUnitIndex(idx)}
                  onMouseLeave={() => setActiveUnitIndex(null)}
                >
                  {unitStatus.map((entry: any, i: number) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      stroke={activeUnitIndex === i ? '#fff' : 'transparent'}
                      strokeWidth={activeUnitIndex === i ? 2 : 0}
                      style={{
                        filter: activeUnitIndex === i ? 'brightness(1.2)' : 'brightness(1)',
                        transition: 'all 0.3s ease',
                        transformOrigin: 'center',
                        transform: activeUnitIndex === i ? 'scale(1.05)' : 'scale(1)',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ====== Bottom Row ====== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          {/* Shortcuts */}
          <div className="fire-card-v2 flex flex-col overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.35s', animationFillMode: 'both' }}>
            <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                快捷入口
              </h3>
            </div>
            <div className="p-3 grid grid-cols-4 gap-3 flex-1">
              {shortcuts.map((s: any, i: number) => {
                const Icon = s.icon;
                const hasBadge = s.badge && String(s.badge).length > 0;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(s.path)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border ${s.border} ${s.bg} hover:bg-slate-700/40 transition-all duration-300 hover:-translate-y-1 active:scale-95 text-left group relative`}
                    style={{ transitionProperty: 'transform, box-shadow, background-color' }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      const glow = s.color === 'text-red-400' ? 'rgba(239,68,68,0.15)'
                        : s.color === 'text-orange-400' ? 'rgba(249,115,22,0.15)'
                        : s.color === 'text-emerald-400' ? 'rgba(16,185,129,0.15)'
                        : s.color === 'text-cyan-400' ? 'rgba(6,182,212,0.15)'
                        : s.color === 'text-yellow-400' ? 'rgba(245,158,11,0.15)'
                        : s.color === 'text-purple-400' ? 'rgba(139,92,246,0.15)'
                        : s.color === 'text-pink-400' ? 'rgba(236,72,153,0.15)'
                        : 'rgba(59,130,246,0.15)';
                      el.style.boxShadow = `0 8px 24px -4px rgba(0,0,0,0.4), 0 0 16px ${glow}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 0 transparent';
                    }}
                  >
                    <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <span className={`text-[11px] ${s.color} font-medium truncate max-w-full`}>{s.label}</span>
                    {hasBadge && (
                      <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 font-bold border border-red-500/20 animate-pulse">
                        {s.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Todo List */}
          <div className="fire-card-v2 flex flex-col overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-cyan-400" />
                待办事项
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 progress-fire-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">{doneCount}/{totalCount}</span>
              </div>
            </div>
            <div className="p-3 flex-1 overflow-y-auto scrollbar-thin space-y-2">
              {todos.map((t, idx) => {
                const isDone = checked.includes(t.id);
                const isUrgent = t.priority === 'urgent';
                const pColor = isUrgent
                  ? 'text-red-400 border-red-500/30 bg-red-500/10'
                  : t.priority === 'high'
                    ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                    : 'text-blue-400 border-blue-500/30 bg-blue-500/10';
                const pLabel = isUrgent ? '紧急' : t.priority === 'high' ? '重要' : '一般';
                const rowClass = isUrgent && !isDone ? 'animate-border-flash' : '';

                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-200 ${
                      isDone
                        ? 'border-slate-700/20 bg-slate-800/20 opacity-50'
                        : 'border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/30 hover:border-slate-600/40 hover:shadow-lg hover:shadow-blue-500/5'
                    } ${rowClass} animate-fade-in-up`}
                    style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                  >
                    <button
                      onClick={() => toggleCheck(t.id)}
                      className={`flex-shrink-0 transition-colors ${isDone ? 'text-emerald-500' : 'text-slate-600 hover:text-emerald-500/70'}`}
                    >
                      {isDone ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[11px] block truncate ${isDone ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{t.title}</span>
                    </div>
                    <Badge variant="outline" className={`text-[7px] px-1 py-0.5 ${pColor}`}>
                      {pLabel}
                    </Badge>
                    <span className="text-[9px] text-slate-500 flex-shrink-0">{t.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="fire-card-v2 flex flex-col overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.45s', animationFillMode: 'both' }}>
            <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                告警处理统计
              </h3>
              <span className="text-[9px] text-emerald-400 font-medium">处理率 {monthSummary.handleRate}%</span>
            </div>
            <div className="p-3 flex flex-col h-full">
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="week" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} width={18} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="alarms" name="告警总数" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={12} animationDuration={800} />
                  <Bar dataKey="handled" name="已处理" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 pt-3 border-t border-slate-700/30 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">本月告警总数</span>
                  <span className="text-slate-200 font-medium">{monthSummary.alarmTotal} 起</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">已处理</span>
                  <span className="text-emerald-400 font-medium">{monthSummary.handled} 起 ({monthSummary.handleRate}%)</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">本月防火巡查</span>
                  <span className="text-blue-400 font-medium">{inspectionMonthCount} 次</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">说明</span>
                  <span className="text-slate-500 font-medium text-[9px]">指标来自实时库表聚合</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DataContainer>
  );
}
