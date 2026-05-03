/**
 * ═══════════════════════════════════════════════════════════════
 * PageHeader - 统一页面头部组件
 * 支持：标题、副标题、图标、右侧操作区、面包屑
 * ═══════════════════════════════════════════════════════════════
 */
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
  children?: React.ReactNode; // 右侧操作区
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-800/40 backdrop-blur-sm px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10', iconClassName)}>
            <Icon className="h-5 w-5 text-blue-400" />
          </div>
        )}
        <div>
          <h1 className="text-base font-semibold text-slate-100">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
