/**
 * ═══════════════════════════════════════════════════════════════════
 * AppFallback - 统一页面加载占位组件
 * 消除 App.tsx 与 MainLayout.tsx 中的重复定义
 * ═══════════════════════════════════════════════════════════════════
 */



interface AppFallbackProps {
  /** 是否使用紧凑模式（App.tsx 路由级） */
  compact?: boolean;
}

export default function AppFallback({ compact = false }: AppFallbackProps) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-2 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <div className="text-slate-500 text-sm">页面加载中...</div>
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full animate-loading-bar" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 border-2 border-blue-500/10 rounded-full" />
        <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin" />
        <div className="absolute inset-2 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-4 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
      </div>
      <div className="text-slate-400 text-sm font-medium tracking-wide">页面模块加载中，请稍候…</div>
      <div className="w-56 h-1 bg-slate-800/80 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full animate-loading-bar" />
      </div>
    </div>
  );
}
