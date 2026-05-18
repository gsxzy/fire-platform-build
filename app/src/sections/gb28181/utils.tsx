export function statusCfg(s: string, isLocal?: boolean) {
  if (isLocal) return { label: '预配置', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' };
  switch (s) {
    case 'online': return { label: '在线', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' };
    case 'registering': return { label: '注册中', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400 animate-pulse' };
    case 'offline': return { label: '离线', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500' };
    case 'fault': return { label: '故障', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-400' };
    default: return { label: s, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500' };
  }
}

export function StatCard({ label, value, unit, icon, color }: {
  label: string; value: number; unit: string; icon: React.ReactNode; color: 'indigo' | 'emerald' | 'slate' | 'red' | 'blue';
}) {
  const map: Record<string, { text: string; bg: string; border: string; iconColor: string }> = {
    indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', iconColor: 'text-indigo-400' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', iconColor: 'text-emerald-400' },
    slate: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', iconColor: 'text-slate-400' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', iconColor: 'text-red-400' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', iconColor: 'text-blue-400' },
  };
  const c = map[color];
  return (
    <div className={`rounded-xl p-3 border ${c.border} ${c.bg} backdrop-blur-sm transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
        <div className={c.iconColor}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${c.text} tabular-nums`}>{value}</span>
        <span className="text-[10px] text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
