with open('src/sections/FireControlRoomPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Header: add scan-line
content = content.replace(
    '<div className="flex-shrink-0 glass rounded-xl px-3 py-2 flex items-center justify-between">',
    '<div className="flex-shrink-0 glass rounded-xl px-3 py-2 flex items-center justify-between scan-line relative overflow-hidden">'
)

# 2. Stat panel fire - led pulse when count > 0
content = content.replace(
    "alarmTab === 'fire' ? 'ring-1 ring-red-500/40 bg-red-500/5 border-t-red-500' : realtime.fire_count > 0 ? 'border-t-red-500 hover:bg-red-500/5' : 'border-t-red-500/30 hover:bg-slate-800/30'",
    "alarmTab === 'fire' ? 'ring-1 ring-red-500/40 bg-red-500/5 border-t-red-500' : realtime.fire_count > 0 ? 'border-t-red-500 hover:bg-red-500/5 led-pulse-red' : 'border-t-red-500/30 hover:bg-slate-800/30'"
)
content = content.replace(
    '<span className="text-base font-bold text-red-400 leading-none">{realtime.fire_count}</span>',
    '<span className={`text-base font-bold leading-none ${realtime.fire_count > 0 ? "text-red-400 glow-text-red" : "text-red-400/40"}`}>{realtime.fire_count}</span>'
)

# 3. Stat panel fault - led pulse when count > 0
content = content.replace(
    "alarmTab === 'fault' ? 'ring-1 ring-yellow-500/40 bg-yellow-500/5 border-t-yellow-500' : realtime.fault_count > 0 ? 'border-t-yellow-500 hover:bg-yellow-500/5' : 'border-t-yellow-500/30 hover:bg-slate-800/30'",
    "alarmTab === 'fault' ? 'ring-1 ring-yellow-500/40 bg-yellow-500/5 border-t-yellow-500' : realtime.fault_count > 0 ? 'border-t-yellow-500 hover:bg-yellow-500/5 led-pulse-yellow' : 'border-t-yellow-500/30 hover:bg-slate-800/30'"
)
content = content.replace(
    '<span className="text-base font-bold text-yellow-400 leading-none">{realtime.fault_count}</span>',
    '<span className={`text-base font-bold leading-none ${realtime.fault_count > 0 ? "text-yellow-400 glow-text-yellow" : "text-yellow-400/40"}`}>{realtime.fault_count}</span>'
)

# 4. Stat panel shield/feedback - dim when 0
content = content.replace(
    '<span className="text-base font-bold text-purple-400 leading-none">{realtime.shield_count}</span>',
    '<span className={`text-base font-bold leading-none ${realtime.shield_count > 0 ? "text-purple-400" : "text-purple-400/40"}`}>{realtime.shield_count}</span>'
)
content = content.replace(
    '<span className="text-base font-bold text-blue-400 leading-none">{realtime.feedback_count}</span>',
    '<span className={`text-base font-bold leading-none ${realtime.feedback_count > 0 ? "text-blue-400" : "text-blue-400/40"}`}>{realtime.feedback_count}</span>'
)

# 5. PressureGauge with color zones
old_pg = '''function PressureGauge({ label, value, unit, max }: { label: string; value: number; unit: string; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const angle = (pct / 100) * 180 - 90;
  const uid = `pg-${label.replace(/\\s/g, '')}`;
  return (
    <div className="flex flex-col items-center justify-center gap-1 fire-card p-2 hover:border-emerald-500/20 hover:scale-[1.01] group">
      <svg viewBox="0 0 60 40" className="w-full h-10">
        <defs><linearGradient id={uid} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
        <path d="M5 35 A25 25 0 0 1 55 35" fill="none" stroke="#1e293b" strokeWidth="4" />
        <path d={`M5 35 A25 25 0 0 1 ${5 + 50 * (pct/100)} ${35 - 25 * Math.sin(Math.PI * (pct/100))}`} fill="none" stroke={`url(#${uid})`} strokeWidth="4" />
        <line x1="30" y1="35" x2="30" y2="15" stroke="#94a3b8" strokeWidth="2" transform={`rotate(${angle} 30 35)`} />
        <circle cx="30" cy="35" r="3" fill="#475669" />
      </svg>
      <span className="text-[11px] font-bold text-slate-200">{value?.toFixed(2) || '0.00'}</span>
      <span className="text-[8px] text-slate-500">{unit}</span>
      <span className="text-[8px] text-emerald-400 font-medium">{label}</span>
    </div>
  );
}'''

new_pg = '''function PressureGauge({ label, value, unit, max }: { label: string; value: number; unit: string; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const angle = (pct / 100) * 180 - 90;
  const uid = `pg-${label.replace(/\\s/g, '')}`;
  const zoneColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex flex-col items-center justify-center gap-1 fire-card p-2 hover:border-emerald-500/20 hover:scale-[1.01] group">
      <svg viewBox="0 0 60 40" className="w-full h-10">
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981"/><stop offset="50%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#ef4444"/>
          </linearGradient>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(16,185,129,0.15)"/><stop offset="50%" stopColor="rgba(245,158,11,0.15)"/><stop offset="100%" stopColor="rgba(239,68,68,0.15)"/>
          </linearGradient>
        </defs>
        <path d="M5 35 A25 25 0 0 1 55 35" fill="none" stroke={`url(#${uid}-bg)`} strokeWidth="5" />
        <path d="M5 35 A25 25 0 0 1 20 12.5" fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth="2" strokeDasharray="2,2" />
        <path d="M20 12.5 A25 25 0 0 1 40 12.5" fill="none" stroke="rgba(245,158,11,0.4)" strokeWidth="2" strokeDasharray="2,2" />
        <path d="M40 12.5 A25 25 0 0 1 55 35" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="2" strokeDasharray="2,2" />
        <path d={`M5 35 A25 25 0 0 1 ${5 + 50 * (pct/100)} ${35 - 25 * Math.sin(Math.PI * (pct/100))}`} fill="none" stroke={zoneColor} strokeWidth="4" strokeLinecap="round" />
        <line x1="30" y1="35" x2="30" y2="15" stroke={zoneColor} strokeWidth="2" transform={`rotate(${angle} 30 35)`} />
        <circle cx="30" cy="35" r="3" fill="#475669" />
        <text x="5" y="38" fontSize="4" fill="rgba(16,185,129,0.5)">0</text>
        <text x="54" y="38" fontSize="4" fill="rgba(239,68,68,0.5)">{max}</text>
      </svg>
      <span className="text-[11px] font-bold" style={{ color: zoneColor }}>{value?.toFixed(2) || '0.00'}</span>
      <span className="text-[8px] text-slate-500">{unit}</span>
      <span className="text-[8px] font-medium" style={{ color: zoneColor }}>{label}</span>
    </div>
  );
}'''

content = content.replace(old_pg, new_pg)

# 6. LiquidLevel with danger zones
old_ll = '''function LiquidLevel({ label, value, unit, max }: { label: string; value: number; unit: string; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex flex-col items-center justify-center gap-1 fire-card p-2 hover:border-blue-500/20 hover:scale-[1.01] group">
      <div className="w-7 h-12 border-2 border-slate-600 rounded-lg relative overflow-hidden bg-slate-900/50">
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500/50 to-blue-400/30 transition-all" style={{ height: `${pct}%` }} />
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-[8px] text-blue-200 font-bold">{value?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
      <span className="text-[8px] text-slate-500">{unit}</span>
      <span className="text-[8px] text-blue-400 font-medium">{label}</span>
    </div>
  );
}'''

new_ll = '''function LiquidLevel({ label, value, unit, max }: { label: string; value: number; unit: string; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const zoneColor = pct < 20 ? '#ef4444' : pct > 90 ? '#f59e0b' : '#3b82f6';
  return (
    <div className="flex flex-col items-center justify-center gap-1 fire-card p-2 hover:border-blue-500/20 hover:scale-[1.01] group">
      <div className="w-8 h-14 border-2 border-slate-600 rounded-lg relative overflow-hidden bg-slate-900/50">
        <div className="absolute top-0 left-0 right-0 h-[20%] border-b border-dashed border-red-500/30" />
        <div className="absolute bottom-0 left-0 right-0 h-[20%] border-t border-dashed border-red-500/30" />
        <div className="absolute top-[20%] bottom-[20%] left-0 right-0 border-t border-b border-dashed border-emerald-500/20" />
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-500" style={{ height: `${pct}%`, background: `linear-gradient(to top, ${zoneColor}60, ${zoneColor}30)` }} />
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-[8px] font-bold" style={{ color: zoneColor }}>{value?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
      <span className="text-[8px] text-slate-500">{unit}</span>
      <span className="text-[8px] font-medium" style={{ color: zoneColor }}>{label}</span>
    </div>
  );
}'''

content = content.replace(old_ll, new_ll)

# 7. MultilineCard LED indicators with pulse + color text
content = content.replace(
    '<div className="flex items-center gap-1.5 flex-shrink-0">\n          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full ${running ? \'bg-emerald-400\' : \'bg-slate-700\'}`} /><span className={`${s.indicatorText} text-slate-500`}>启</span></div>\n          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full ${feedback ? \'bg-blue-400\' : \'bg-slate-700\'}`} /><span className={`${s.indicatorText} text-slate-500`}>反</span></div>\n          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full ${fault ? \'bg-red-400\' : \'bg-slate-700\'}`} /><span className={`${s.indicatorText} text-slate-500`}>故</span></div>\n        </div>',
    '<div className="flex items-center gap-1.5 flex-shrink-0">\n          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${running ? \'bg-emerald-400 led-pulse-green\' : \'bg-slate-700\'}`} /><span className={`${s.indicatorText} ${running ? \'text-emerald-400\' : \'text-slate-500\'}`}>启</span></div>\n          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${feedback ? \'bg-blue-400\' : \'bg-slate-700\'}`} /><span className={`${s.indicatorText} ${feedback ? \'text-blue-400\' : \'text-slate-500\'}`}>反</span></div>\n          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${fault ? \'bg-red-400 led-pulse-red\' : \'bg-slate-700\'}`} /><span className={`${s.indicatorText} ${fault ? \'text-red-400\' : \'text-slate-500\'}`}>故</span></div>\n        </div>'
)

# 8. BusCard LED indicators with pulse
content = content.replace(
    '<div className="flex items-center justify-center gap-2">\n        <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full ${running ? \'bg-emerald-400\' : \'bg-slate-700\'}`} /><span className={`${s.subText} ${running ? \'text-emerald-400\' : \'text-slate-600\'}`}>启动</span></div>\n        <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full ${feedback ? \'bg-blue-400\' : \'bg-slate-700\'}`} /><span className={`${s.subText} ${feedback ? \'text-blue-400\' : \'text-slate-600\'}`}>反馈</span></div>\n      </div>',
    '<div className="flex items-center justify-center gap-2">\n        <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${running ? \'bg-emerald-400 led-pulse-green\' : \'bg-slate-700\'}`} /><span className={`${s.subText} ${running ? \'text-emerald-400\' : \'text-slate-600\'}`}>启动</span></div>\n        <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${feedback ? \'bg-blue-400\' : \'bg-slate-700\'}`} /><span className={`${s.subText} ${feedback ? \'text-blue-400\' : \'text-slate-600\'}`}>反馈</span></div>\n      </div>'
)

# 9. AlarmTable row type indicators
content = content.replace(
    'fireAlarms.slice(0, 4).forEach((a: FireAlarm) => rows.push(\n        <div key={`fire-${a.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row border-b border-slate-700/10 items-center group">',
    'fireAlarms.slice(0, 4).forEach((a: FireAlarm) => rows.push(\n        <div key={`fire-${a.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row fire-table-row-red border-b border-slate-700/10 items-center group">'
)
content = content.replace(
    'faultAlarms.slice(0, 4).forEach((f: FaultAlarm) => rows.push(\n        <div key={`fault-${f.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row border-b border-slate-700/10 items-center group">',
    'faultAlarms.slice(0, 4).forEach((f: FaultAlarm) => rows.push(\n        <div key={`fault-${f.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row fire-table-row-amber border-b border-slate-700/10 items-center group">'
)
content = content.replace(
    'shieldItems.slice(0, 4).forEach((s: ShieldItem) => rows.push(\n        <div key={`shield-${s.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row border-b border-slate-700/10 items-center group">',
    'shieldItems.slice(0, 4).forEach((s: ShieldItem) => rows.push(\n        <div key={`shield-${s.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row fire-table-row-purple border-b border-slate-700/10 items-center group">'
)
content = content.replace(
    'feedbackAlarms.slice(0, 4).forEach((fb: FeedbackAlarm) => rows.push(\n        <div key={`fb-${fb.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row border-b border-slate-700/10 items-center group">',
    'feedbackAlarms.slice(0, 4).forEach((fb: FeedbackAlarm) => rows.push(\n        <div key={`fb-${fb.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row fire-table-row-cyan border-b border-slate-700/10 items-center group">'
)

with open('src/sections/FireControlRoomPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
