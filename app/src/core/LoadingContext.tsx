/**
 * ═══════════════════════════════════════════════════════════════
 * 全局加载状态管理 + 顶部进度条 + 骨架屏
 * ═══════════════════════════════════════════════════════════════
 */
import { createContext, useContext, useState, useCallback } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  progress: number;
  message: string;
  startLoading: (msg?: string) => void;
  setProgress: (p: number) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProg] = useState(0);
  const [message, setMessage] = useState('加载中...');

  const startLoading = useCallback((msg = '加载中...') => {
    setMessage(msg);
    setProg(0);
    setIsLoading(true);
  }, []);

  const setProgress = useCallback((p: number) => {
    setProg(Math.min(100, Math.max(0, p)));
  }, []);

  const stopLoading = useCallback(() => {
    setProg(100);
    setTimeout(() => {
      setIsLoading(false);
      setProg(0);
    }, 300);
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, progress, message, startLoading, setProgress, stopLoading }}>
      {children}
      {/* Top Progress Bar */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[400]">
          <div className="h-0.5 bg-slate-800/50">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                boxShadow: '0 0 8px rgba(59,130,246,0.5)',
              }}
            />
          </div>
          {progress === 0 && (
            <div className="h-0.5 bg-blue-500/20 animate-pulse" style={{ width: '30%' }} />
          )}
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider');
  return ctx;
}
