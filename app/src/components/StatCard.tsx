import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export type StatColor = 'blue' | 'red' | 'yellow' | 'emerald' | 'cyan' | 'purple' | 'orange' | 'slate' | 'indigo';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  Icon?: LucideIcon;
  color?: StatColor;
  sub?: string;
  change?: string;
  up?: boolean;
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

const colorMap: Record<StatColor, { text: string; bg: string; border: string; iconColor: string; glow: string; gradient: string }> = {
  blue:    { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    iconColor: 'text-blue-400',    glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',    gradient: 'from-blue-500/20 to-cyan-500/20' },
  red:     { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     iconColor: 'text-red-400',     glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',     gradient: 'from-red-500/20 to-orange-500/20' },
  yellow:  { text: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  iconColor: 'text-yellow-400',  glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',  gradient: 'from-yellow-500/20 to-amber-500/20' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', iconColor: 'text-emerald-400', glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]', gradient: 'from-emerald-500/20 to-green-500/20' },
  cyan:    { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    iconColor: 'text-cyan-400',    glow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',    gradient: 'from-cyan-500/20 to-blue-500/20' },
  purple:  { text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  iconColor: 'text-purple-400',  glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]',  gradient: 'from-purple-500/20 to-pink-500/20' },
  orange:  { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  iconColor: 'text-orange-400',  glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',  gradient: 'from-orange-500/20 to-red-500/20' },
  slate:   { text: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   iconColor: 'text-slate-400',   glow: 'hover:shadow-[0_0_20px_rgba(100,116,139,0.15)]', gradient: 'from-slate-500/20 to-gray-500/20' },
  indigo:  { text: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  iconColor: 'text-indigo-400',  glow: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]', gradient: 'from-indigo-500/20 to-purple-500/20' },
};

export default function StatCard({
  label,
  value,
  unit = '',
  icon,
  Icon,
  color = 'blue',
  sub,
  change,
  up,
  layout = 'vertical',
  className = '',
}: StatCardProps) {
  const c = colorMap[color];
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  if (layout === 'horizontal') {
    return (
      <div className={`fire-card p-3 flex items-center gap-3 active-press ${c.glow} transition-all duration-300 ${className}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${c.gradient} border ${c.border}`}>
          {Icon ? <Icon className={`w-5 h-5 ${c.iconColor}`} /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-slate-400">{label}</div>
          <div className="text-sm font-bold text-slate-100">{displayValue}</div>
          {sub && <div className="text-[9px] text-slate-500">{sub}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`fire-card p-3.5 ${c.glow} active-press transition-all duration-300 hover:-translate-y-0.5 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-caption text-slate-400 font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.gradient} border ${c.border} flex items-center justify-center shadow-sm`}>
          {Icon ? <Icon className={`w-4 h-4 ${c.iconColor}`} /> : <span className={c.iconColor}>{icon}</span>}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xl font-bold text-slate-100 tabular-nums tracking-tight">{displayValue}</span>
        {unit && <span className="text-[10px] text-slate-500">{unit}</span>}
        {change && (
          <span className={`text-label flex items-center gap-0.5 font-medium px-1 py-0.5 rounded ${up ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {change}
          </span>
        )}
      </div>
      {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
