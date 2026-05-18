interface StatCardProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'slate';
}

export default function StatCard({ label, value, unit, icon, color }: StatCardProps) {
  const colorMap = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400', value: 'text-blue-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', value: 'text-emerald-400' },
    slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: 'text-slate-400', value: 'text-slate-400' },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-xl p-3 border ${c.border} ${c.bg} backdrop-blur-sm transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
        <div className={`${c.icon}`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${c.value} tabular-nums`}>{value}</span>
        <span className="text-[10px] text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
