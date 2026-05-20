import type { RealtimeData, IotDeviceRealtime } from '../types';

export function SciFiGauge({ label, value, unit, max, color, flash }: {
  label: string; value: number; unit: string; max: number; color: string; flash?: boolean;
}) {
  const numValue = typeof value === 'number' && !isNaN(value) ? value : (Number(value) || 0);
  const pct = Math.min(100, Math.max(0, (numValue / max) * 100));
  const radius = 28;
  const cx = 32;
  const cy = 34;
  const startAngle = 135;
  const endAngle = 405;
  const angle = startAngle + (pct / 100) * (endAngle - startAngle);
  const rad = (angle * Math.PI) / 180;
  const nx = cx + radius * Math.cos(rad);
  const ny = cy + radius * Math.sin(rad);
  const zoneColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : color;

  const isAbnormal = (label.includes('压力') && (numValue > 0.8 || numValue < 0.2)) || (label.includes('液位') && numValue < 1.0);

  return (
    <div className={`flex flex-col items-center justify-center gap-1 relative p-1 rounded-lg transition-all ${flash ? 'data-changed' : ''} ${isAbnormal ? 'alarm-critical-v2 rounded-lg' : ''}`}>
      <svg viewBox="0 0 64 44" className="w-full h-12">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={zoneColor} stopOpacity="0.8" />
          </linearGradient>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Background arc */}
        <path d={`M ${cx + radius * Math.cos((startAngle * Math.PI) / 180)} ${cy + radius * Math.sin((startAngle * Math.PI) / 180)} A ${radius} ${radius} 0 1 1 ${cx + radius * Math.cos((endAngle * Math.PI) / 180)} ${cy + radius * Math.sin((endAngle * Math.PI) / 180)}`}
          fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="6" strokeLinecap="round" />
        {/* Value arc */}
        <path d={`M ${cx + radius * Math.cos((startAngle * Math.PI) / 180)} ${cy + radius * Math.sin((startAngle * Math.PI) / 180)} A ${radius} ${radius} 0 ${angle > startAngle + 180 ? 1 : 0} 1 ${nx} ${ny}`}
          fill="none" stroke={`url(#grad-${label})`} strokeWidth="6" strokeLinecap="round" filter={`url(#glow-${label})`} />
        {/* Ticks */}
        {[0, 25, 50, 75, 100].map(t => {
          const ta = startAngle + (t / 100) * (endAngle - startAngle);
          const tr = (ta * Math.PI) / 180;
          const tx1 = cx + (radius - 4) * Math.cos(tr);
          const ty1 = cy + (radius - 4) * Math.sin(tr);
          const tx2 = cx + (radius + 2) * Math.cos(tr);
          const ty2 = cy + (radius + 2) * Math.sin(tr);
          return <line key={t} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="rgba(148,163,184,0.3)" strokeWidth="0.5" />;
        })}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="2" fill={zoneColor} />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={cx + (radius - 8) * Math.cos(rad)} y2={cy + (radius - 8) * Math.sin(rad)}
          stroke={zoneColor} strokeWidth="1.5" strokeLinecap="round" />
        {/* Value text */}
        <text x={cx} y={cy + 6} className="sci-fi-value" fill={zoneColor}>{numValue.toFixed(2)}</text>
        <text x={cx} y={cy + 11} className="sci-fi-unit">{unit}</text>
      </svg>
      <span className="text-[8px] font-medium" style={{ color: zoneColor }}>{label}</span>
    </div>
  );
}

function IotDeviceRow({ dev }: { dev: IotDeviceRealtime }) {
  const color = dev.deviceType.includes('压') ? '#10b981' : dev.deviceType.includes('液') ? '#06b6d4' : '#3b82f6';
  const isOffline = dev.status !== 1;
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md border transition-all ${isOffline ? 'border-slate-700/20 opacity-50' : 'border-slate-700/30 hover:border-slate-600/50'}`}>
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOffline ? 'bg-slate-600' : 'bg-emerald-400 led-pulse-green'}`} />
      <span className="text-[9px] text-slate-300 truncate flex-1 min-w-0">{dev.name}</span>
      <span className={`text-[10px] font-bold font-mono ${isOffline ? 'text-slate-600' : 'text-slate-200'}`}>{typeof dev.value === 'number' ? dev.value.toFixed(2) : dev.value}</span>
      <span className="text-[8px] text-slate-500 w-6 text-right">{dev.unit}</span>
      <div className="w-16 h-1 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, (dev.value / dev.max) * 100))}%`, backgroundColor: isOffline ? '#475569' : color }} />
      </div>
    </div>
  );
}

export function SciFiGaugePanel({ realtime, onSwitchVideo, flashes }: {
  realtime: RealtimeData; onSwitchVideo: () => void;
  flashes: { p1: boolean; p2: boolean; l1: boolean; l2: boolean };
}) {
  const iotDevices = realtime.iotDevices || [];
  return (
    <div className="flex-1 sci-fi-panel rounded-xl p-2 flex flex-col gap-2 min-h-0 relative corner-accent-v2">
      <div className="cb-tl" /><div className="cb-tr" /><div className="cb-bl" /><div className="cb-br" />
      <div className="sci-fi-scan-line" />
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 relative z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 bg-cyan-400/60 rounded-full" />
          <span className="text-[10px] text-cyan-300 font-bold tracking-wider sci-fi-text">SENSOR_DATA</span>
          <span className="text-[8px] text-cyan-500/50 px-1.5 py-0.5 bg-cyan-500/5 rounded border border-cyan-500/10">LIVE</span>
        </div>
        <button onClick={onSwitchVideo} className="text-[9px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>视频
        </button>
      </div>
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      {/* Gauges */}
      <div className="grid grid-cols-2 gap-2 flex-shrink-0 relative z-10">
        <SciFiGauge label="管网压力" value={realtime.pressure_1} unit="MPa" max={1} color="#10b981" flash={flashes.p1} />
        <SciFiGauge label="喷淋压力" value={realtime.pressure_2} unit="MPa" max={1} color="#3b82f6" flash={flashes.p2} />
        <SciFiGauge label="水箱液位" value={realtime.liquid_level_1} unit="m" max={5} color="#06b6d4" flash={flashes.l1} />
        <SciFiGauge label="消防水池" value={realtime.liquid_level_2} unit="m" max={5} color="#8b5cf6" flash={flashes.l2} />
      </div>
      {/* Dynamic IoT devices */}
      {iotDevices.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col gap-1 relative z-10 overflow-hidden">
          <div className="flex items-center gap-1.5 px-1 flex-shrink-0">
            <div className="w-0.5 h-2 bg-cyan-400/60 rounded-full" />
            <span className="text-[9px] text-cyan-400/80 font-medium tracking-wide">物联设备</span>
            <span className="text-[8px] text-slate-600">({iotDevices.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 pr-0.5">
            {iotDevices.map(dev => <IotDeviceRow key={dev.id} dev={dev} />)}
          </div>
        </div>
      )}
      {/* Bottom data strip */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-900/40 rounded border border-slate-700/20 flex-shrink-0 relative z-10">
        <span className="text-[8px] text-slate-500 sci-fi-text">HOST_ID: {realtime.host_status === 1 ? 'ONLINE' : 'OFFLINE'}</span>
        <span className="text-[8px] text-slate-500 sci-fi-text">MODE: {realtime.current_mode === 2 ? 'AUTO' : 'MANUAL'}</span>
      </div>
    </div>
  );
}
