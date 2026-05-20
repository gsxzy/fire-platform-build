/**
 * ═══════════════════════════════════════════════════════════════════
 * Sidebar 折叠状态管理 Context
 * 提供全局侧边栏展开/折叠状态，支持跨组件共享
 * ═══════════════════════════════════════════════════════════════════
 */
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (v: boolean) => void;
  mobile: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggleSidebar: () => {},
  setCollapsed: () => {},
  mobile: false,
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    // 从localStorage读取用户偏好
    try {
      return localStorage.getItem('sfp_sidebar_collapsed') === 'true';
    } catch { return false; }
  });
  const [mobile, setMobile] = useState(false);

  // 响应式：窗口宽度<1024px自动折叠，<768px进入移动端模式
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const isMobile = w < 768;
      const shouldCollapse = w < 1024;
      setMobile(isMobile);
      setCollapsed(prev => {
        // 只在自动切换时更新，保留用户手动展开的权利
        if (shouldCollapse && !prev) return true;
        if (!shouldCollapse && prev && isMobile === false) {
          // 大屏恢复时尝试恢复用户偏好
          try {
            return localStorage.getItem('sfp_sidebar_collapsed') === 'true';
          } catch { return false; }
        }
        return prev;
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sfp_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  const setCollapsedWrapped = useCallback((v: boolean) => {
    setCollapsed(v);
    localStorage.setItem('sfp_sidebar_collapsed', String(v));
  }, []);

  const value = useMemo(() => ({ collapsed, toggleSidebar, setCollapsed: setCollapsedWrapped, mobile }), [collapsed, toggleSidebar, setCollapsedWrapped, mobile]);

  return (
    <SidebarContext.Provider value={value as any}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
