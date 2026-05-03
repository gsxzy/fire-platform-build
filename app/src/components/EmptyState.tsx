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
  data: { title: '暂无数据', description: '当前列表为空，您可以点击上方「新增」按钮添加记录' },
  search: { title: '未找到匹配结果', description: '请尝试更换关键词或清除筛选条件' },
  error: { title: '加载失败', description: '数据加载出错，请稍后重试' },
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
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mb-4 ring-1 ring-slate-700/20">
        <Icon className="w-7 h-7 text-slate-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-medium text-slate-300 mb-1">{title || defaultTitle}</h3>
      {(description || defaultDesc) && (
        <p className="text-xs text-slate-500 max-w-xs text-center leading-relaxed">{description || defaultDesc}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
