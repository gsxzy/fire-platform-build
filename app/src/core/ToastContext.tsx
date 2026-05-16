/**
 * ═══════════════════════════════════════════════════════════════
 * 全局 Toast 通知系统
 * 支持 success / error / warning / info 四种类型
 * 自动消失 + 手动关闭 + 最多显示5条
 * ═══════════════════════════════════════════════════════════════
 */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  show: (toast: Omit<ToastItem, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const typeConfig: Record<ToastType, { icon: typeof CheckCircle; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const show = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const duration = toast.duration ?? 4000;

    setToasts(prev => {
      const next = [...prev, { ...toast, id }];
      return next.slice(-5); // 最多5条
    });

    const timer = setTimeout(() => remove(id), duration);
    timersRef.current.set(id, timer);
  }, [remove]);

  const success = useCallback((title: string, message?: string) => show({ type: 'success', title, message }), [show]);
  const error = useCallback((title: string, message?: string) => show({ type: 'error', title, message }), [show]);
  const warning = useCallback((title: string, message?: string) => show({ type: 'warning', title, message }), [show]);
  const info = useCallback((title: string, message?: string) => show({ type: 'info', title, message }), [show]);

  // Cleanup on unmount（捕获当前 Map 引用，避免 cleanup 读到已被替换的 ref）
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, remove }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-16 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast, index) => {
          const cfg = typeConfig[toast.type];
          const Icon = cfg.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-80 rounded-lg border ${cfg.border} ${cfg.bg} backdrop-blur-sm shadow-xl p-3 flex items-start gap-2.5 transform transition-all duration-300 animate-in slide-in-from-right`}
              style={{
                animationDelay: `${index * 50}ms`,
                animation: 'toastSlideIn 0.3s ease-out forwards',
              }}
            >
              <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-medium ${cfg.color}`}>{toast.title}</div>
                {toast.message && <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{toast.message}</div>}
              </div>
              <button onClick={() => remove(toast.id)} className="text-slate-500 hover:text-slate-300 flex-shrink-0 mt-0.5" aria-label="关闭">
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
