import { Outlet, useLocation } from 'react-router';
import { Suspense } from 'react';
import { SidebarProvider } from '@/core/SidebarContext';
import PageBreadcrumb from '@/core/PageBreadcrumb';
import PageCommercialHint from '@/core/PageCommercialHint';
import AppFallback from '@/components/AppFallback';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import AIAssistant from './AIAssistant';
import KeyboardShortcuts from './KeyboardShortcuts';
import ErrorBoundary from '@/components/ErrorBoundary';

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
  const location = useLocation();
  return (
    <div className="flex flex-1 overflow-hidden relative z-10">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-hidden p-2 md:p-4 scrollbar-thin relative flex flex-col max-w-full" style={{ background: 'transparent' }}>
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
