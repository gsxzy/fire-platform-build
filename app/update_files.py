import pathlib
mainlayout = """import { Outlet } from 'react-router';
import { Suspense } from 'react';
import { SidebarProvider } from '@/core/SidebarContext';
import PageBreadcrumb from '@/core/PageBreadcrumb';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import AIAssistant from './AIAssistant';
import KeyboardShortcuts from './KeyboardShortcuts';
import ErrorBoundary from '@/components/ErrorBoundary';

function AppFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 border-2 border-blue-500/10 rounded-full" />
        <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin" />
        <div className="absolute inset-2 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-4 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
      </div>
      <div className="text-slate-400 text-sm font-medium tracking-wide">“≥√Êº”‘ÿ÷–...</div>
      <div className="w-56 h-1 bg-slate-800/80 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full animate-loading-bar" />
      </div>
      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 70%; margin-left: 0%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-loading-bar { animation: loading-bar 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function MainLayout() {
  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col fire-dark relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/[0.02] rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
        </div>
        <Header />
        <LayoutBody />
      </div>
    </SidebarProvider>
  );
}

function LayoutBody() {
  return (
    <div className="flex flex-1 overflow-hidden relative z-10">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-4 scrollbar-thin relative" style={{ background: 'transparent' }}>
          <PageBreadcrumb />
          <div className="animate-fade-in-up">
            <ErrorBoundary>
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
"""
pathlib.Path('src/sections/MainLayout.tsx').write_text(mainlayout, encoding='utf-8')
print('done')
