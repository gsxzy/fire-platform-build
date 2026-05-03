import { Clock, Activity, Wifi, HardDrive, Database, Shield, Server } from 'lucide-react';
import { useEffect, useState } from 'react';

/* ═══════ Animated stat counter ═══════ */
function useAnimatedValue(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
}

export default function Footer() {
  const [time, setTime] = useState(new Date());
  const [latency, setLatency] = useState(12);
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing'>('connected');
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate uptime counter
  useEffect(() => {
    const timer = setInterval(() => setUptime(p => p + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Simulate latency fluctuation
  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(Math.floor(8 + Math.random() * 20));
      setDbStatus(Math.random() > 0.9 ? 'syncing' : 'connected');
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useAnimatedValue(3298);

  const formatUptime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <footer className="h-9 flex items-center justify-between px-4 text-[10px] glass-subtle relative overflow-hidden" style={{ borderTop: '1px solid rgba(71,85,105,0.2)' }}>
      {/* Subtle glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      
      <div className="flex items-center gap-3 text-slate-500">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/40 border border-slate-700/20" title="当前系统时间">
          <Clock className="w-3 h-3 text-blue-400" />
          <span className="text-slate-300 font-mono">{time.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </span>
        <span className="h-3 w-px bg-slate-700/30" />
        <span className="flex items-center gap-1.5" title="服务器状态">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-emerald-400 font-medium">运行中</span>
        </span>
        <span className="h-3 w-px bg-slate-700/30" />
        <span className="flex items-center gap-1.5" title="数据库状态">
          {dbStatus === 'connected' ? (
            <><Database className="w-3 h-3 text-blue-400" /><span className="text-blue-400 font-medium">已连接</span></>
          ) : (
            <><Database className="w-3 h-3 text-yellow-400 animate-pulse" /><span className="text-yellow-400 font-medium">同步中</span></>
          )}
        </span>
        <span className="h-3 w-px bg-slate-700/30" />
        <span className="flex items-center gap-1.5" title="网络延迟">
          <Wifi className="w-3 h-3 text-slate-400" />
          <span className={latency > 25 ? 'text-yellow-400 font-medium' : 'text-emerald-400 font-medium'}>{latency}ms</span>
        </span>
        <span className="h-3 w-px bg-slate-700/30 hidden md:block" />
        <span className="hidden md:flex items-center gap-1.5" title="运行时长">
          <Server className="w-3 h-3 text-slate-400" />
          <span className="text-slate-400">{formatUptime(uptime)}</span>
        </span>
      </div>

      <div className="flex items-center gap-3 text-slate-500">
        <span className="hidden md:flex items-center gap-1.5" title="系统负载">
          <Activity className="w-3 h-3 text-slate-400" />
          <span className="text-slate-400">CPU <span className="text-slate-300 font-medium">12%</span></span>
        </span>
        <span className="hidden md:flex items-center gap-1.5" title="内存使用">
          <HardDrive className="w-3 h-3 text-slate-400" />
          <span className="text-slate-400">内存 <span className="text-slate-300 font-medium">3.2GB</span></span>
        </span>
        <span className="h-3 w-px bg-slate-700/30 hidden md:block" />
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/20">
          <Shield className="w-2.5 h-2.5 text-blue-400" />
          <span className="text-slate-400">V2.0.0</span>
        </span>
        <span className="text-slate-600">&copy; 2026 新致远智慧消防</span>
      </div>
    </footer>
  );
}
