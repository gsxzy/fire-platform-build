/**
 * ═══════════════════════════════════════════════════════════════
 * 骨架屏组件集合
 * 表格骨架屏 / 卡片骨架屏 / 统计骨架屏
 * ═══════════════════════════════════════════════════════════════
 */
import { useMemo } from 'react';

/* ── 基础闪烁块 ── */
function ShimmerBlock({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-slate-700/30 rounded animate-pulse ${className}`} style={style} />
  );
}

/* ── 表格骨架屏 ── */
export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-2 p-2">
        {Array.from({ length: cols }).map((_, i) => (
          <ShimmerBlock key={i} className="h-4 flex-1" style={{ width: `${100 / cols}%` } as any} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-2 p-2">
          {Array.from({ length: cols }).map((_, ci) => (
            <ShimmerBlock key={ci} className="h-8 flex-1" style={{ width: `${100 / cols}%`, opacity: 0.5 + (ri % 3) * 0.15 } as any} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── 卡片骨架屏 ── */
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(count, 4)} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShimmerBlock className="w-8 h-8 rounded" />
            <ShimmerBlock className="h-4 w-24" />
          </div>
          <ShimmerBlock className="h-8 w-16" />
          <ShimmerBlock className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

/* ── 统计卡片骨架屏 ── */
export function StatsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShimmerBlock className="w-6 h-6 rounded" />
            <ShimmerBlock className="h-3 w-16" />
          </div>
          <ShimmerBlock className="h-7 w-12" />
          <ShimmerBlock className="h-2 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ── 详情页骨架屏 ── */
export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="w-6 h-6 rounded" />
        <ShimmerBlock className="h-5 w-32" />
        <ShimmerBlock className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <ShimmerBlock className="h-3 w-20" />
            <ShimmerBlock className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 图表骨架屏 ── */
export function ChartSkeleton() {
  const heights = useMemo(() => Array.from({ length: 12 }, (_, i) => `${20 + ((i * 7) % 60)}%`), []);
  return (
    <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-4 space-y-3">
      <ShimmerBlock className="h-4 w-32" />
      <div className="flex items-end gap-1 h-32">
        {Array.from({ length: 12 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            className="flex-1 rounded-t"
            style={{ height: heights[i], opacity: 0.3 + (i % 3) * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
