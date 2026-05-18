import { TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAnimatedNumber } from '../hooks';
import { colorMap, sparkDataMap } from '../utils';
import type { StatItem } from '../types';

export default function AnimatedStatCard({ s, index }: { s: StatItem; index: number }) {
  const Icon = s.icon;
  const c = colorMap[s.color];
  const isUrgent = s.label === '今日火警' || s.label === '待确认告警';
  const numericValue = typeof s.value === 'string' ? parseFloat(s.value) : s.value;
  const animated = useAnimatedNumber(numericValue);
  const displayValue = typeof s.value === 'string' && s.value.includes('%')
    ? `${animated.toFixed(1)}%`
    : animated.toLocaleString();
  const sparkData = sparkDataMap[s.label] || [0, 0, 0, 0, 0, 0, 0];
  const sparkColor =
    s.color === 'red' ? '#f87171' :
    s.color === 'yellow' ? '#fbbf24' :
    s.color === 'emerald' ? '#34d399' :
    s.color === 'orange' ? '#fb923c' :
    s.color === 'cyan' ? '#22d3ee' :
    '#60a5fa';

  return (
    <div
      className={`animate-fade-in-up relative group ${isUrgent ? 'animate-pulse-glow' : ''}`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div className={`stat-card-v2 ${c.border} ${c.bg} card-shine relative overflow-hidden`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium">{s.label}</span>
          <div className={`${c.iconColor}`}><Icon className="w-3.5 h-3.5" /></div>
        </div>
        <div className="flex items-baseline gap-1 relative z-10">
          <span className={`text-lg font-bold ${c.text} tabular-nums`}>{displayValue}</span>
          {s.trend !== '0' && (
            <span className={`text-[8px] flex items-center ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>
              {s.up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {s.trend}
            </span>
          )}
        </div>
        <div className="absolute bottom-1 right-1 opacity-20 group-hover:opacity-50 transition-opacity pointer-events-none">
          <div className="w-14 h-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData.map((v, idx) => ({ idx, v }))}>
                <defs>
                  <linearGradient id={`spark-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.2}
                  fill={`url(#spark-${index})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
