import { useState, useEffect } from 'react';
import {
  Wifi, Activity, Clock,
  Server, Database, Zap, TrendingUp, TrendingDown, Minus,
  CheckCircle, AlertTriangle, XCircle, RefreshCw
} from 'lucide-react';

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

const generateHistory = (base: number, variance: number): number[] => {
  return Array.from({ length: 20 }, () => base + (Math.random() - 0.5) * variance);
};

const initialMetrics: Metric[] = [
  { name: 'CPU 使用率', value: 32.5, unit: '%', status: 'normal', trend: 'stable', history: generateHistory(35, 15) },
  { name: '内存使用', value: 58.2, unit: '%', status: 'normal', trend: 'up', history: generateHistory(60, 10) },
  { name: '磁盘 IO', value: 12.8, unit: 'MB/s', status: 'normal', trend: 'down', history: generateHistory(15, 8) },
  { name: '网络吞吐', value: 856.3, unit: 'Mbps', status: 'normal', trend: 'up', history: generateHistory(800, 200) },
];

const services: Service[] = [
  { name: 'API Gateway', status: 'running', uptime: '45天12时', version: 'v2.4.1', pid: 1245, memory: '256MB' },
  { name: 'Device Service', status: 'running', uptime: '45天12时', version: 'v2.3.8', pid: 1256, memory: '512MB' },
  { name: 'Alarm Engine', status: 'running', uptime: '45天10时', version: 'v2.4.0', pid: 1267, memory: '384MB' },
  { name: 'Notification Service', status: 'running', uptime: '45天12时', version: 'v2.3.5', pid: 1278, memory: '192MB' },
  { name: 'Data Collector', status: 'warning', uptime: '12天6时', version: 'v2.3.9', pid: 1290, memory: '1.2GB' },
  { name: 'Report Generator', status: 'running', uptime: '45天12时', version: 'v2.2.1', pid: 1301, memory: '320MB' },
  { name: 'File Storage', status: 'running', uptime: '60天2时', version: 'v1.8.5', pid: 1312, memory: '128MB' },
  { name: 'Message Queue', status: 'running', uptime: '60天2时', version: 'v3.1.2', pid: 1323, memory: '448MB' },
];

const logs: LogEntry[] = [
  { time: '09:18:32', level: 'info', module: 'AlarmEngine', message: '火警告警处理完成: id=ALM-20260419-00123' },
  { time: '09:18:15', level: 'info', module: 'DeviceService', message: '设备心跳接收: GW-LZ-001' },
  { time: '09:17:48', level: 'warn', module: 'DataCollector', message: '数据采集延迟超过阈值: 延迟 3.2s' },
  { time: '09:17:22', level: 'info', module: 'Notification', message: '短信发送成功: 138****1234' },
  { time: '09:16:55', level: 'info', module: 'API Gateway', message: '请求 /api/v2/devices/status 200 OK' },
  { time: '09:16:30', level: 'error', module: 'DataCollector', message: '数据库连接池耗尽，等待重试...' },
  { time: '09:15:48', level: 'info', module: 'AlarmEngine', message: '新告警触发: 万达广场1F烟感' },
  { time: '09:15:12', level: 'info', module: 'DeviceService', message: '设备离线恢复: NP-LZ-0089' },
  { time: '09:14:35', level: 'warn', module: 'ReportGen', message: '报表生成队列堆积: 待处理 12 个' },
  { time: '09:13:58', level: 'info', module: 'Notification', message: 'App推送成功: 工单 WP-20260419-0042' },
];

export default function SystemMonitorPage() {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(m => {
        const newValue = Math.max(0, m.value + (Math.random() - 0.5) * m.value * 0.1);
        const history = [...m.history.slice(1), newValue];
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (m.name === 'CPU 使用率') {
          if (newValue > 80) status = 'critical';
          else if (newValue > 60) status = 'warning';
        } else if (m.name === '内存使用') {
          if (newValue > 85) status = 'critical';
          else if (newValue > 70) status = 'warning';
        }
        return { ...m, value: newValue, status, history };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

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
      {/* Header — glass */}
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

      {/* System Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OverviewCard
          label="系统运行时间"
          value="45天12时"
          subtext="运行正常"
          subColor="text-emerald-400"
          icon={<Server className="w-4 h-4 text-blue-400" />}
          color="blue"
        />
        <OverviewCard
          label="数据库连接"
          value="24/25"
          subtext="1个连接等待"
          subColor="text-yellow-400"
          icon={<Database className="w-4 h-4 text-purple-400" />}
          color="purple"
        />
        <OverviewCard
          label="设备在线率"
          value="98.7%"
          subtext="3,256 / 3,298 在线"
          subColor="text-slate-500"
          icon={<Wifi className="w-4 h-4 text-emerald-400" />}
          color="emerald"
        />
        <OverviewCard
          label="QPS"
          value="1,245"
          subtext="+12% 较昨日"
          subColor="text-emerald-400"
          icon={<Zap className="w-4 h-4 text-orange-400" />}
          color="orange"
        />
      </div>

      {/* Metrics with Sparklines */}
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
            {services.map((s: any) => (
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
            ))}
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
            {filteredLogs.map((l: any, i: number) => (
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
            ))}
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
