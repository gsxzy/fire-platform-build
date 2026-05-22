import { Outlet, useLocation } from 'react-router';
import { Suspense, lazy } from 'react';
import { SidebarProvider } from '@/core/SidebarContext';
import PageBreadcrumb from '@/core/PageBreadcrumb';
import PageCommercialHint from '@/core/PageCommercialHint';
import AppFallback from '@/components/AppFallback';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import ErrorBoundary from '@/components/ErrorBoundary';

/* 延迟加载非首屏必需组件，减少初始 JS 体积 */
const AIAssistant = lazy(() => import('./AIAssistant'));
const KeyboardShortcuts = lazy(() => import('./KeyboardShortcuts'));

export default function MainLayout() {
  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col fire-dark relative overflow-hidden bigscreen-root">
        {/* 多层背景效果：渐变光晕 + 网格 */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* 顶部蓝色光晕 */}
          <div className="absolute -top-1/4 left-1/4 w-[800px] h-[800px] bg-blue-500/[0.012] rounded-full blur-3xl" />
          {/* 底部青色光晕 */}
          <div className="absolute -bottom-1/4 right-1/4 w-[800px] h-[800px] bg-cyan-500/[0.012] rounded-full blur-3xl" />
          {/* 右上角紫色微光 */}
          <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-purple-500/[0.008] rounded-full blur-3xl" />
          {/* 微妙网格 */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(59,130,246,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59,130,246,0.02) 1px, transparent 1px)
              `,
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(ellipse at center, black 15%, transparent 75%)'
            }}
          />
        </div>
        <Header />
        <LayoutBody />
      </div>
    </SidebarProvider>
  );
}

function LayoutBody() {
  const location = useLocation();
  return (
    <div className="flex flex-1 overflow-hidden relative z-10">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main 
          className="flex-1 overflow-hidden p-2 md:p-4 scrollbar-thin relative flex flex-col max-w-full"
          style={{ background: 'transparent' }}
        >
          <PageBreadcrumb />
          <PageCommercialHint />
          <div className="animate-fade-in-up flex-1 overflow-hidden flex flex-col min-h-0 min-w-0 max-w-full">
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<AppFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
        <Footer />
        <AIAssistant />
        <KeyboardShortcuts />
      </div>
    </div>
  );
}
