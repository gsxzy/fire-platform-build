import { Server, Search, Inbox, FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  type?: 'data' | 'search' | 'error' | 'custom';
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  className?: string;
}

const icons = {
  data: Inbox,
  search: Search,
  error: Server,
  custom: FolderOpen,
};

const defaults = {
  data: {
    title: '暂无数据',
    description: '当前暂无相关记录。可调整筛选条件、稍后刷新，或通过「新增」等操作补录；若持续无数据请联系管理员核对接入与权限。',
  },
  search: {
    title: '未找到匹配结果',
    description: '请尝试更换关键词、放宽筛选或清空条件后重试。',
  },
  error: {
    title: '加载失败',
    description: '数据暂不可用，请检查网络后重试；若多次失败请联系技术支持。',
  },
  custom: { title: '暂无内容', description: '' },
};

export default function EmptyState({
  type = 'data',
  title,
  description,
  icon: CustomIcon,
  action,
  className = '',
}: EmptyStateProps) {
  const Icon = CustomIcon || icons[type];
  const { title: defaultTitle, description: defaultDesc } = defaults[type];

  return (
    <div className={`flex flex-col items-center justify-center py-14 animate-fade-in-up ${className}`}>
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/50 border border-slate-700/30 flex items-center justify-center ring-1 ring-slate-700/20 shadow-lg shadow-slate-900/20">
          <Icon className="w-8 h-8 text-slate-500" strokeWidth={1.5} />
        </div>
        <div className="absolute -inset-1 rounded-2xl border border-slate-700/10 animate-pulse-glow pointer-events-none" />
      </div>
      <h3 className="text-sm font-semibold text-slate-200 mb-1.5 tracking-wide">{title || defaultTitle}</h3>
      {(description || defaultDesc) && (
        <p className="text-xs text-slate-500 max-w-xs text-center leading-relaxed px-4">{description || defaultDesc}</p>
      )}
      {action && <div className="mt-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>{action}</div>}
    </div>
  );
}
