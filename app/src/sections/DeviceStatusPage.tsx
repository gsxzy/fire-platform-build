import { useState, useEffect } from 'react';
import { deviceService } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Cpu, WifiOff, AlertTriangle, CheckCircle, Activity, Wrench, Bell } from 'lucide-react';

interface StatsItem {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const fallbackStats: StatsItem[] = [
  { label: '设备总数', value: 0, icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: '正常设备', value: 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: '故障设备', value: 0, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { label: '离线设备', value: 0, icon: WifiOff, color: 'text-red-400', bg: 'bg-red-500/10' },
  { label: '维护中', value: 0, icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: '今日告警', value: 0, icon: Bell, color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

const typeMap: Record<string, string> = {
  detector: '烟感探测器', button: '手报', pump: '消防泵', fan: '风机',
  host: '报警主机', camera: '摄像头', 'gb28181-camera': 'GB28181摄像头',
  'fire-controller': '火灾报警控制器', water: '水源监测',
  electrical: '电气火灾', 'smoke-exhaust': '防排烟', lighting: '应急照明',
  'elec-monitor': '电气监测', 'pressure-sensor': '压力传感器',
  'level-sensor': '液位传感器', sensor: '传感器', monitor: '监控器',
  alarm: '报警器', controller: '控制器', elevator: '电梯', broadcast: '广播',
};

export default function DeviceStatusPage() {
  const [stats, setStats] = useState<StatsItem[]>(fallbackStats);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载概览统计
      const statsRes = await deviceService.getStats();
      if (statsRes.code === 200 && statsRes.data) {
        const t = statsRes.data.total || {};
        setStats([
          { label: '设备总数', value: t.total || 0, icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: '正常设备', value: t.normal || 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: '故障设备', value: t.fault || 0, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: '离线设备', value: t.offline || 0, icon: WifiOff, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: '维护中', value: t.maintenance || 0, icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: '今日告警', value: statsRes.data.todayAlarm || 0, icon: Bell, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ]);
        setCategoryStats(statsRes.data.category || []);
      }
    } catch (e) { /* ignore */ }

    // 实时状态列表可通过后续扩展 websocket 或 dedicated API 加载

    setLoading(false);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">设备状态监控</h2>
            <p className="text-[10px] text-slate-500">实时设备运行状态与统计分析</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-600/30 transition-colors"
        >
          刷新数据
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-3 flex-shrink-0">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-slate-700/50 bg-slate-800/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-100">{s.value}</div>
                  <div className="text-[10px] text-slate-500">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 分类统计 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-1 min-h-0">
        <Card className="border-slate-700/50 bg-slate-800/50 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-3 border-b border-slate-700/50 flex-shrink-0">
              <h3 className="text-xs font-medium text-slate-200">设备类型分布</h3>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {categoryStats.length === 0 && !loading && (
                <div className="text-center text-xs text-slate-500 py-8">暂无数据</div>
              )}
              {categoryStats.map((t: any, i: number) => {
                const rate = t.count > 0 ? Math.round((t.normal / t.count) * 100) : 0;
                return (
                  <div key={i} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                    <span className="col-span-4 text-[10px] text-slate-200">{typeMap[t.category] || t.category}</span>
                    <span className="col-span-2 text-[10px] text-slate-400">{t.count}</span>
                    <span className="col-span-2 text-[10px] text-emerald-400">{t.normal}</span>
                    <span className="col-span-1 text-[10px] text-red-400">{t.offline}</span>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-400 w-8">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 bg-slate-800/50 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-3 border-b border-slate-700/50 flex-shrink-0">
              <h3 className="text-xs font-medium text-slate-200">健康度概览</h3>
            </div>
            <div className="flex-1 p-4 flex flex-col items-center justify-center gap-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="url(#healthGrad)" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - (Number(stats[1]?.value) || 0) / Math.max(Number(stats[0]?.value) || 1, 1))}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-100">
                    {Math.round((Number(stats[1]?.value) || 0) / Math.max(Number(stats[0]?.value) || 1, 1) * 100)}%
                  </span>
                  <span className="text-[9px] text-slate-500">正常率</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="p-2 rounded-lg bg-slate-700/30 border border-slate-600/20 text-center">
                  <div className="text-xs text-slate-400">待处理维护</div>
                  <div className="text-sm font-bold text-orange-400 mt-1">-</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-700/30 border border-slate-600/20 text-center">
                  <div className="text-xs text-slate-400">平均健康度</div>
                  <div className="text-sm font-bold text-blue-400 mt-1">-</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
