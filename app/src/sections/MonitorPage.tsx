import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { useNavigate } from 'react-router';
import {
  Activity, Bell, Cpu, Video, Link2,
  ArrowUpRight, Shield, Flame, Wifi
} from 'lucide-react';

/* ═══════ 监控中心首页 ═══════ */

const MODULE_CONFIG = [
  {
    id: 'monitor-fire',
    title: '火灾报警监控',
    icon: Flame,
    desc: '实时火警、故障、监管信号',
    color: 'red',
    path: '/monitor/fire',
    status: '正常运行',
    count: '3个未处理告警',
  },
  {
    id: 'monitor-video',
    title: '视频监控',
    icon: Video,
    desc: '实时视频画面、AI识别',
    color: 'blue',
    path: '/monitor/video',
    status: '12路在线',
    count: '2路离线',
  },
  {
    id: 'monitor-control',
    title: '数智消控室',
    icon: Cpu,
    desc: '消防控制室远程管理',
    color: 'purple',
    path: '/monitor/control',
    status: '7个消控室',
    count: '全部在线',
  },
  {
    id: 'monitor-subsys',
    title: '子系统监控',
    icon: Activity,
    desc: '水系统、电气、防排烟等',
    color: 'cyan',
    path: '/monitor/subsys',
    status: '8个子系统',
    count: '1个故障',
  },
  {
    id: 'monitor-linkage',
    title: '安消联动',
    icon: Link2,
    desc: '联动规则配置与触发记录',
    color: 'orange',
    path: '/monitor/linkage',
    status: '8条规则',
    count: '全部启用',
  },
];

const COLOR_STYLES: Record<string, {
  bg: string;
  icon: string;
  border: string;
  hoverBorder: string;
  hoverShadow: string;
  badge: string;
}> = {
  red: {
    bg: 'bg-red-500/10',
    icon: 'text-red-400',
    border: 'border-red-500/10',
    hoverBorder: 'hover:border-red-500/30',
    hoverShadow: 'hover:shadow-red-500/5',
    badge: 'text-red-400 bg-red-500/10',
  },
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-400',
    border: 'border-blue-500/10',
    hoverBorder: 'hover:border-blue-500/30',
    hoverShadow: 'hover:shadow-blue-500/5',
    badge: 'text-blue-400 bg-blue-500/10',
  },
  purple: {
    bg: 'bg-purple-500/10',
    icon: 'text-purple-400',
    border: 'border-purple-500/10',
    hoverBorder: 'hover:border-purple-500/30',
    hoverShadow: 'hover:shadow-purple-500/5',
    badge: 'text-purple-400 bg-purple-500/10',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    icon: 'text-cyan-400',
    border: 'border-cyan-500/10',
    hoverBorder: 'hover:border-cyan-500/30',
    hoverShadow: 'hover:shadow-cyan-500/5',
    badge: 'text-cyan-400 bg-cyan-500/10',
  },
  orange: {
    bg: 'bg-orange-500/10',
    icon: 'text-orange-400',
    border: 'border-orange-500/10',
    hoverBorder: 'hover:border-orange-500/30',
    hoverShadow: 'hover:shadow-orange-500/5',
    badge: 'text-orange-400 bg-orange-500/10',
  },
};

const fallbackStats = [
  { label: '在线设备', value: 156, unit: '台', icon: Wifi, color: 'emerald' as const },
  { label: '今日告警', value: 23, unit: '条', icon: Bell, color: 'red' as const },
  { label: '视频通道', value: 12, unit: '路', icon: Video, color: 'blue' as const },
  { label: '联动规则', value: 8, unit: '条', icon: Link2, color: 'orange' as const },
];

const STAT_COLORS: Record<string, { text: string; bg: string; border: string; icon: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400' },
  red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'text-red-400' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: 'text-orange-400' },
};

export default function MonitorPage() {
  const navigate = useNavigate();

  const [modules, setModules] = useState(MODULE_CONFIG as any);
  const [stats, setStats] = useState(fallbackStats as any);

  useEffect(() => {
    legacyApi.monitorOverview().then((res: any) => {
      if (res.data) {
        if (Array.isArray(res.data.modules)) setModules(res.data.modules as any);
        if (Array.isArray(res.data.stats)) setStats(res.data.stats as any);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="p-4 space-y-5 h-full overflow-y-auto scrollbar-thin">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">实时监控</h2>
            <p className="text-[10px] text-slate-500">设备与告警实时监控</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(stats as any).map((s: any, i: number) => {
          const Icon = s.icon || [Wifi, Bell, Video, Link2][i];
          const cs = STAT_COLORS[s.color] || STAT_COLORS.blue;
          return (
            <div
              key={s.label}
              className={`rounded-xl p-3.5 border ${cs.border} ${cs.bg} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-medium">{s.label}</span>
                <Icon className={`w-3.5 h-3.5 ${cs.icon}`} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${cs.text} tabular-nums`}>{s.value}</span>
                <span className="text-[10px] text-slate-500">{s.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((m: any) => {
          const Icon = m.icon;
          const styles = COLOR_STYLES[m.color] || COLOR_STYLES.blue;
          const isAlert = m.count?.includes('故障') || m.count?.includes('离线') || m.count?.includes('告警');
          return (
            <button
              key={m.id}
              onClick={() => navigate(m.path)}
              className={`text-left rounded-xl border border-slate-700/30 bg-slate-800/40 p-4 transition-all duration-300 group hover:bg-slate-800/60 ${styles.hoverBorder} hover:shadow-lg ${styles.hoverShadow}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${styles.bg} flex items-center justify-center border ${styles.border} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-5 h-5 ${styles.icon}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{m.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{m.desc}</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors duration-300" />
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  <span className="text-slate-400">{m.status}</span>
                </span>
                <span className="text-slate-700">|</span>
                <span className={`px-1.5 py-0.5 rounded-md font-medium ${isAlert ? 'text-red-400 bg-red-500/10' : 'text-slate-500'}`}>
                  {m.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom hint */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 pt-2">
        <Shield className="w-3 h-3" />
        <span>系统运行正常 · 所有监控模块就绪</span>
      </div>
    </div>
  );
}
