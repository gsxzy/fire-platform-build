import { useState } from 'react';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { legacyApi } from '@/api/services';
import DataContainer from '@/components/DataContainer';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Cpu, Flame, AlertTriangle, Wifi, WifiOff,
  Droplets, Zap, Wind, TrendingUp, Users,
  Wrench, ClipboardCheck, Bell, Activity
} from 'lucide-react';

const bigStatsInit = [
  { label: '联网单位', value: 156, unit: '家', icon: Building2, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { label: '设备总数', value: '12,860', unit: '台', icon: Cpu, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { label: '在线设备', value: '12,412', unit: '台', icon: Wifi, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { label: '设备在线率', value: '96.5', unit: '%', icon: Activity, color: 'text-green-400', bg: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { label: '今日火警', value: 23, unit: '条', icon: Flame, color: 'text-red-400', bg: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  { label: '今日故障', value: 89, unit: '条', icon: AlertTriangle, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
  { label: '维保工单', value: 12, unit: '条', icon: Wrench, color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { label: '巡检任务', value: 6, unit: '项', icon: ClipboardCheck, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30' },
];

const alarmTrendInit = [
  { hour: '00', fire: 1, fault: 3 }, { hour: '02', fire: 0, fault: 2 }, { hour: '04', fire: 0, fault: 1 },
  { hour: '06', fire: 1, fault: 4 }, { hour: '08', fire: 3, fault: 8 }, { hour: '10', fire: 8, fault: 15 },
  { hour: '12', fire: 2, fault: 10 }, { hour: '14', fire: 3, fault: 12 }, { hour: '16', fire: 2, fault: 9 },
  { hour: '18', fire: 1, fault: 7 }, { hour: '20', fire: 1, fault: 5 }, { hour: '22', fire: 1, fault: 4 },
];

const unitAlarmsInit = [
  { name: '万达广场', fire: 5, fault: 12, online: 98.2 },
  { name: '兰州石化', fire: 4, fault: 18, online: 99.1 },
  { name: '兰大二院', fire: 3, fault: 8, online: 99.5 },
  { name: '兰州中心', fire: 3, fault: 10, online: 97.1 },
  { name: '西北师大', fire: 4, fault: 14, online: 97.8 },
  { name: '靖煤酒店', fire: 2, fault: 6, online: 95.5 },
  { name: '红星美凯龙', fire: 2, fault: 9, online: 94.8 },
  { name: '新区专精特新', fire: 0, fault: 3, online: 99.9 },
];

const recentAlarmsInit = [
  { time: '10:23:15', unit: '万达广场', device: '1F大厅烟感', type: '火警', level: '紧急' },
  { time: '10:18:42', unit: '万达广场', device: 'B1温感', type: '火警', level: '紧急' },
  { time: '09:56:33', unit: '万达广场', device: '排烟风机#3', type: '故障', level: '严重' },
  { time: '09:45:21', unit: '兰州石化', device: '电气火灾监控器', type: '火警', level: '紧急' },
  { time: '09:30:18', unit: '兰州中心', device: '消防栓泵', type: '故障', level: '严重' },
  { time: '09:15:05', unit: '兰大二院', device: '3F烟感', type: '火警', level: '紧急' },
  { time: '09:05:44', unit: '万达广场', device: '水池液位仪', type: '预警', level: '提示' },
  { time: '08:50:22', unit: '西北师大', device: '应急照明', type: '故障', level: '一般' },
  { time: '08:30:15', unit: '万达广场', device: '管网压力监测', type: '预警', level: '提示' },
  { time: '08:15:33', unit: '兰州石化', device: '灭火器#12', type: '监管', level: '一般' },
];

export default function BigScreenPage() {
  const [bigStats, setBigStats] = useState(bigStatsInit as any);
  const [alarmTrend, setAlarmTrend] = useState(alarmTrendInit as any);
  const [unitAlarms, setUnitAlarms] = useState(unitAlarmsInit as any);
  const [recentAlarms, setRecentAlarms] = useState(recentAlarmsInit as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await legacyApi.bigScreen() as any;
      const data = res.data ?? res;
      if (data && typeof data === 'object') {
        if (data.summary) setBigStats(data.summary as any);
        if (Array.isArray(data.alarmTrend)) setAlarmTrend(data.alarmTrend as any);
        if (Array.isArray(data.unitAlarms)) setUnitAlarms(data.unitAlarms as any);
        if (Array.isArray(data.recentAlarms)) setRecentAlarms(data.recentAlarms as any);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }

  useVisibilityPolling(loadData, 30000);

  const maxVal = Math.max(...alarmTrend.map((d: any) => d.fire + d.fault));

  return (
    <DataContainer loading={loading} error={error} data={bigStats} onRetry={loadData} emptyText="暂无数据">
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-900/30 via-slate-800/50 to-blue-900/30 border border-blue-500/20">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="新致远智慧消防" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-wider">新致远智慧消防远程监控中心</h1>
            <p className="text-xs text-slate-500">XinZhiYuan Smart Fire Remote Monitoring Center</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-300 font-mono">2025年2月1日 星期六 10:23:15</div>
          <div className="text-xs text-slate-500">联网单位：156家 | 设备总数：12,860台</div>
        </div>
      </div>

      {/* Big Stats */}
      <div className="grid grid-cols-4 xl:grid-cols-8 gap-3 mb-4">
        {bigStats.map((s: any, i: number) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`p-3 rounded-xl border ${s.border} bg-gradient-to-br ${s.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[10px] text-slate-400">{s.label}</span>
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}<span className="text-[10px] text-slate-500 ml-0.5">{s.unit}</span></div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="xl:col-span-2 p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-200">24小时报警趋势</span>
          </div>
          <div className="flex items-end gap-1 h-40">
            {alarmTrend.map((d: any, i: number) => {
              const total = d.fire + d.fault;
              const h = Math.max(4, (total / maxVal) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[8px] text-slate-500">{total}</span>
                  <div className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden" style={{ height: `${h}%` }}>
                    <div className="bg-red-500/70" style={{ height: `${(d.fire / total) * 100}%` }} />
                    <div className="bg-yellow-500/70" style={{ height: `${(d.fault / total) * 100}%` }} />
                  </div>
                  <span className="text-[8px] text-slate-500">{d.hour}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><div className="w-3 h-2 bg-red-500/70 rounded-sm" />火警</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><div className="w-3 h-2 bg-yellow-500/70 rounded-sm" />故障</span>
          </div>
        </div>

        {/* Recent Alarms */}
        <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-slate-200">最近报警</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {recentAlarms.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30">
                <span className="text-[9px] text-slate-500 font-mono w-14">{a.time}</span>
                <Badge className={`text-[7px] px-0.5 ${a.type === '火警' ? 'bg-red-500/20 text-red-400' : a.type === '故障' ? 'bg-yellow-500/20 text-yellow-400' : a.type === '预警' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{a.type}</Badge>
                <span className="text-[10px] text-slate-300 flex-1 truncate">{a.unit}</span>
                <span className="text-[8px] text-slate-500 truncate">{a.device}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unit Alarm Rank */}
        <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-200">单位报警排名</span>
          </div>
          <div className="space-y-2">
            {unitAlarms.map((u: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-4 text-center">{i + 1}</span>
                <span className="text-[10px] text-slate-200 flex-1 truncate">{u.name}</span>
                <span className="text-[8px] text-red-400">{u.fire}</span>
                <span className="text-[8px] text-yellow-400">{u.fault}</span>
                <div className="w-12 h-1 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${u.online}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subsystem Status */}
        <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-slate-200">子系统状态</span>
          </div>
          <div className="space-y-3">
            {[
              { name: '消防给水', icon: Droplets, online: 31, total: 32, alarm: 2, color: 'text-blue-400' },
              { name: '电气火灾', icon: Zap, online: 24, total: 24, alarm: 1, color: 'text-yellow-400' },
              { name: '防排烟', icon: Wind, online: 26, total: 28, alarm: 3, color: 'text-cyan-400' },
            ].map((s: any, i: number) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-200">{s.name}</span>
                      <span className="text-slate-500">{s.online}/{s.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mt-0.5">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(s.online / s.total) * 100}%` }} />
                    </div>
                  </div>
                  {s.alarm > 0 && <span className="text-[8px] text-red-400">{s.alarm}条</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Online Stats */}
        <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-slate-200">单位在线状态</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <Wifi className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-emerald-400">143</div>
              <div className="text-[9px] text-slate-500">在线单位</div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <WifiOff className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-red-400">13</div>
              <div className="text-[9px] text-slate-500">离线单位</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {['万达广场', '兰州石化', '兰大二院', '兰州中心', '靖煤酒店'].map((name: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">{name}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400">在线</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </DataContainer>
  );
}
