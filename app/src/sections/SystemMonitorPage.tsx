import { useState, useEffect } from 'react';
import {
  Wifi, Activity, Clock,
  Server, Database, Zap, TrendingUp, TrendingDown, Minus,
  CheckCircle, AlertTriangle, XCircle, RefreshCw
} from 'lucide-react';
import { monitorService, systemConfigService } from '@/api/services';
import EmptyState from '@/components/EmptyState';

interface Metric {
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  history: number[];
}

interface Service {
  name: string;
  status: 'running' | 'warning' | 'stopped';
  uptime: string;
  version: string;
  pid: number;
  memory: string;
}

interface LogEntry {
  time: string;
  level: 'info' | 'warn' | 'error';
  module: string;
  message: string;
}

interface OverviewData {
  uptime?: string;
  dbConnections?: string;
  deviceOnlineRate?: string;
  qps?: string;
}

async function fetchMonitorData(): Promise<{
  metrics: Metric[];
  services: Service[];
  overview: OverviewData;
}> {
  const res: any = await monitorService.get();
  const data = res?.data || {};
  return {
    metrics: data.metrics || [],
    services: data.services || [],
    overview: data.overview || {},
  };
}

async function fetchSystemLogs(): Promise<LogEntry[]> {
  try {
    const res: any = await systemConfigService.logs({ pageNum: 1, pageSize: 50 });
    const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
    return list.map((r: any) => ({
      time: r.created_at || r.time || '-',
      level: (r.result === 'error' ? 'error' : r.result === 'warn' ? 'warn' : 'info') as LogEntry['level'],
      module: r.module || r.action || r.operation || '系统',
      message: r.detail || r.message || r.params || '-',
    }));
  } catch {
    return [];
  }
}

export default function SystemMonitorPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [overview, setOverview] = useState<OverviewData>({} as OverviewData);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [{ metrics: m, services: s, overview: o }, logsData] = await Promise.all([
        fetchMonitorData(),
        fetchSystemLogs(),
      ]);
      setMetrics(m);
      setServices(s);
      setLogs(logsData);
      setOverview(o);
    } catch {
      // 静默失败，保留旧数据
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 每30秒自动刷新一次真实数据（不再使用随机数模拟）
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => loadData();

  const statusColor = (status: string) => {
    switch (status) {
      case 'running': case 'normal': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'stopped': case 'critical': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case 'running': case 'normal': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'stopped': case 'critical': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'running': case 'normal': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'stopped': case 'critical': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const trendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-red-400" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-emerald-400" />;
      default: return <Minus className="w-3 h-3 text-slate-400" />;
    }
  };

  const filteredLogs = logFilter === 'all' ? logs : logs.filter(l => l.level === logFilter);

  const minMax = (arr: number[]) => ({ min: Math.min(...arr), max: Math.max(...arr) });

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">系统监控</h2>
            <p className="text-[10px] text-slate-500">服务器与组件健康状态</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className={`text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/40 bg-slate-800/40 hover:bg-slate-700/40 transition-all ${refreshing ? 'animate-pulse' : ''}`}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* System Overview - 从API获取 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OverviewCard
          label="系统运行时间"
          value={overview.uptime || '--'}
          subtext="运行正常"
          subColor="text-emerald-400"
          icon={<Server className="w-4 h-4 text-blue-400" />}
          color="blue"
        />
        <OverviewCard
          label="数据库连接"
          value={overview.dbConnections || '--'}
          subtext="连接池状态"
          subColor="text-yellow-400"
          icon={<Database className="w-4 h-4 text-purple-400" />}
          color="purple"
        />
        <OverviewCard
          label="设备在线率"
          value={overview.deviceOnlineRate || '--'}
          subtext="实时监控"
          subColor="text-slate-500"
          icon={<Wifi className="w-4 h-4 text-emerald-400" />}
          color="emerald"
        />
        <OverviewCard
          label="QPS"
          value={overview.qps || '--'}
          subtext="实时吞吐量"
          subColor="text-emerald-400"
          icon={<Zap className="w-4 h-4 text-orange-400" />}
          color="orange"
        />
      </div>

      {/* Metrics with Sparklines */}
      {metrics.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m: any, i: number) => {
            const { min, max } = minMax(m.history);
            const range = max - min || 1;
            const barColor = m.status === 'critical' ? '#ef4444' : m.status === 'warning' ? '#eab308' : '#3b82f6';
            return (
              <div
                key={i}
                className="rounded-xl p-4 border border-slate-700/30 bg-slate-800/40 backdrop-blur-sm transition-all hover:border-slate-600/40"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${statusColor(m.status)}`} />
                    <span className="text-[10px] text-slate-400 font-medium">{m.name}</span>
                  </div>
                  {trendIcon(m.trend)}
                </div>
                <div className="text-2xl font-bold text-slate-100 mb-3 tabular-nums">
                  {typeof m.value === 'number' ? m.value.toFixed(1) : Number(m.value || 0).toFixed(1)}
                  <span className="text-xs font-normal text-slate-500 ml-1">{m.unit}</span>
                </div>
                <div className="h-10 flex items-end gap-px">
                  {m.history.map((v: any, j: number) => {
                    const height = ((v - min) / range) * 100;
                    return (
                      <div
                        key={j}
                        className="flex-1 rounded-sm transition-all duration-500"
                        style={{
                          height: `${Math.max(4, height)}%`,
                          background: barColor,
                          opacity: 0.4 + (j / m.history.length) * 0.6,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : loading ? null : (
        <EmptyState type="data" title="暂无性能指标" description="系统监控API尚未返回数据，请稍后刷新" />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Services */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 backdrop-blur-sm overflow-hidden">
          <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              微服务状态
            </h3>
            <span className="text-[10px] text-slate-500">
              {services.filter(s => s.status === 'running').length}/{services.length} 运行中
            </span>
          </div>
          <div className="divide-y divide-slate-700/20">
            {services.length > 0 ? services.map((s: any) => (
              <div
                key={s.pid}
                className="p-3 hover:bg-slate-700/20 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  {statusIcon(s.status)}
                  <div>
                    <div className="text-xs text-slate-200 font-medium">{s.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      PID: {s.pid} | 内存: {s.memory}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium border ${statusBg(s.status)} ${statusColor(s.status)}`}>
                    {s.status === 'running' ? '运行中' : s.status === 'warning' ? '告警' : '已停止'}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-0.5">运行 {s.uptime}</div>
                </div>
              </div>
            )) : (
              <div className="p-8">
                <EmptyState type="data" title="暂无服务状态" description="等待后端返回服务监控数据" />
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 backdrop-blur-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              实时日志
            </h3>
            <div className="flex gap-0.5 bg-slate-800/60 rounded-lg border border-slate-700/40 p-0.5">
              {(['all', 'info', 'warn', 'error'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`text-[9px] px-2 py-0.5 rounded-md transition-all duration-200 font-medium ${
                    logFilter === f
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'info' ? '信息' : f === 'warn' ? '警告' : '错误'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-96 scrollbar-thin divide-y divide-slate-700/20">
            {filteredLogs.length > 0 ? filteredLogs.map((l: any, i: number) => (
              <div key={i} className="p-2.5 hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] text-slate-500 font-mono">{l.time}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${
                    l.level === 'info' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    l.level === 'warn' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {l.level.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500">{l.module}</span>
                </div>
                <p className="text-[11px] text-slate-300 ml-0.5">{l.message}</p>
              </div>
            )) : (
              <div className="p-8">
                <EmptyState type="data" title="暂无日志" description="等待后端返回系统日志" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Overview Card ───── */
function OverviewCard({
  label,
  value,
  subtext,
  subColor,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtext: string;
  subColor: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'emerald' | 'orange';
}) {
  const colorMap = {
    blue: { border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
    purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/10' },
    emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    orange: { border: 'border-orange-500/20', bg: 'bg-orange-500/10' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl p-4 border ${c.border} ${c.bg} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
      <div className={`text-[10px] mt-0.5 font-medium ${subColor}`}>{subtext}</div>
    </div>
  );
}
