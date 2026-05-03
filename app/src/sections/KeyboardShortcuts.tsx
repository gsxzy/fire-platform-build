import { useState, useEffect } from 'react';
import { Keyboard, X, Search, Bell, Command, ArrowLeft, Sun } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
  scope: '全局' | '工作台' | '监控中心' | '告警中心';
  icon: typeof Search;
}

const shortcuts: ShortcutItem[] = [
  { keys: ['Ctrl', 'K'], description: '打开全局搜索', scope: '全局', icon: Search },
  { keys: ['?'], description: '打开快捷键帮助', scope: '全局', icon: Keyboard },
  { keys: ['Esc'], description: '关闭弹窗/面板', scope: '全局', icon: X },
  { keys: ['Ctrl', 'N'], description: '新建待办事项', scope: '工作台', icon: Command },
  { keys: ['Ctrl', 'M'], description: '打开消息通知', scope: '全局', icon: Bell },
  { keys: ['Ctrl', 'T'], description: '切换浅色/深色主题', scope: '全局', icon: Sun },
  { keys: ['Alt', '1'], description: '跳转到工作台', scope: '全局', icon: Command },
  { keys: ['Alt', '2'], description: '跳转到监控中心', scope: '全局', icon: Command },
  { keys: ['Alt', '3'], description: '跳转到告警中心', scope: '全局', icon: Command },
  { keys: ['Alt', '4'], description: '跳转到设备管理', scope: '全局', icon: Command },
  { keys: ['Alt', '5'], description: '跳转到单位管理', scope: '全局', icon: Command },
  { keys: ['G', 'M'], description: '跳转到地图监控', scope: '全局', icon: Command },
  { keys: ['G', 'A'], description: '跳转到报警分析', scope: '全局', icon: Command },
  { keys: ['G', 'S'], description: '跳转到系统设置', scope: '全局', icon: Command },
  { keys: ['/'], description: '聚焦到搜索框', scope: '监控中心', icon: Search },
  { keys: ['R'], description: '刷新当前页面数据', scope: '全局', icon: Command },
  { keys: ['H'], description: '返回上一级页面', scope: '全局', icon: ArrowLeft },
];

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!isOpen) return null;

  const grouped = shortcuts.reduce<Record<string, ShortcutItem[]>>((acc, s) => {
    if (!acc[s.scope]) acc[s.scope] = [];
    acc[s.scope].push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setIsOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-200">键盘快捷键</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-200" aria-label="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {Object.entries(grouped).map(([scope, items]) => (
            <div key={scope}>
              <h4 className="text-[10px] text-slate-500 mb-2 font-medium uppercase tracking-wide">{scope}</h4>
              <div className="space-y-1.5">
                {items.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <s.icon className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs text-slate-300">{s.description}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k: any, j: number) => (
                        <span key={j} className="flex items-center">
                          {j > 0 && <span className="text-[9px] text-slate-600 mx-0.5">+</span>}
                          <kbd className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center bg-slate-700/50 border border-slate-600/30 rounded text-[10px] text-slate-200 font-mono shadow-sm">{k}</kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/30 text-center">
          <span className="text-[10px] text-slate-500">提示：在输入框中按 ? 不会触发此面板</span>
        </div>
      </div>
    </div>
  );
}
