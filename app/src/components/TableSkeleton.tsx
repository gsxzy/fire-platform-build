import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  hasActions?: boolean;
  hasCheckbox?: boolean;
  hasIndex?: boolean;
}

export default function TableSkeleton({ rows = 6, columns = 5, hasActions = true, hasCheckbox = true, hasIndex = false }: TableSkeletonProps) {
  return (
    <div className="space-y-2 p-2">
      {/* Header skeleton */}
      <div className="flex gap-2 px-2 py-2 border-b border-slate-700/30 items-center">
        {hasIndex && <Skeleton className="h-3 w-10 rounded flex-shrink-0" />}
        {hasCheckbox && <Skeleton className="h-3.5 w-3.5 rounded flex-shrink-0" />}
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-3 rounded flex-1" style={{ maxWidth: `${60 + (i % 3) * 40}px` }} />
        ))}
        {hasActions && <Skeleton className="h-3 w-16 rounded flex-shrink-0" />}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-2 px-2 py-3 rounded-lg border border-slate-700/15 bg-slate-800/15 items-center animate-fade-in-up hover:bg-slate-800/25 transition-colors" style={{ animationDelay: `${rowIdx * 0.04}s` }}>
          {hasIndex && <Skeleton className="h-3 w-10 rounded flex-shrink-0" />}
          {hasCheckbox && <Skeleton className="h-3.5 w-3.5 rounded flex-shrink-0" />}
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={`r-${rowIdx}-${colIdx}`} className="h-3 rounded flex-1" style={{ maxWidth: `${60 + (colIdx % 3) * 40}px`, opacity: 0.4 + (colIdx % 2) * 0.15 }} />
          ))}
          {hasActions && (
            <div className="flex gap-1 flex-shrink-0 w-16 justify-end">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-5 w-5 rounded-md" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
