/**
 * 通用数据状态容器 - 自动处理 loading / error / empty / children
 */
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from './EmptyState';
import { useState, useEffect } from 'react';

interface DataContainerProps<T> {
  loading?: boolean;
  error?: Error | string | null;
  data?: T | T[];
  onRetry?: () => void;
  emptyText?: string;
  /** 覆盖 EmptyState 默认说明 */
  emptyDescription?: string;
  emptyType?: 'data' | 'search' | 'error' | 'custom';
  /** 为 true 时数据为空仍渲染 children（如 GIS 地图底图不依赖点位） */
  allowEmptyChildren?: boolean;
  children: React.ReactNode;
}

export default function DataContainer<T>({
  loading,
  error,
  data,
  onRetry,
  emptyText = '暂无数据',
  emptyDescription,
  emptyType = 'data',
  allowEmptyChildren = false,
  children,
}: DataContainerProps<T>) {
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!loading) setRetryCount(0);
  }, [loading]);

  const handleRetry = () => {
    setRetryCount(c => c + 1);
    onRetry?.();
  };

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[240px] gap-4 animate-fade-in-up">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/5">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-blue-500/5 animate-pulse" />
          <div className="absolute -inset-2 rounded-3xl border border-blue-500/5 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="text-slate-400 text-body-sm font-medium">数据加载中，请稍候...</div>
        {/* Skeleton bars */}
        <div className="w-full max-w-lg space-y-2.5 mt-2 px-8">
          {[100, 85, 70, 60, 45].map((w, i) => (
            <div key={i} className="h-3 bg-slate-800/60 rounded animate-shimmer" style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    const msg = typeof error === 'string' ? error : error.message || '加载失败';
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[240px] gap-3 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 flex items-center justify-center shadow-lg shadow-yellow-500/5">
          <AlertTriangle className="w-8 h-8 text-yellow-400" />
        </div>
        <div className="text-slate-200 text-body font-medium">数据加载失败</div>
        <div className="text-slate-500 text-caption max-w-xs text-center">{msg}</div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={handleRetry} className="mt-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 hover:border-slate-500 transition-all">
            <RefreshCw className={`w-3 h-3 mr-1.5 ${retryCount > 0 ? 'animate-spin' : ''}`} />
            重新加载 {retryCount > 0 ? `(${retryCount})` : ''}
          </Button>
        )}
      </div>
    );
  }

  // Empty
  const isEmpty =
    !allowEmptyChildren &&
    (data === undefined || data === null || (Array.isArray(data) && data.length === 0));
  if (isEmpty) {
    return (
      <EmptyState
        type={emptyType}
        title={emptyText}
        description={
          emptyDescription ?? (emptyType === 'data' ? '当前暂无相关数据，请稍后刷新或联系管理员核对接入与权限。' : undefined)
        }
      />
    );
  }

  // Normal
  return <>{children}</>;
}
