import { Routes, Route, Navigate, Outlet } from 'react-router';
import { Suspense, useEffect } from 'react';
import { DynamicRoutes } from '@/core/DynamicRoutes';
import { ToastProvider } from '@/core/ToastContext';
import { LoadingProvider } from '@/core/LoadingContext';
import { PageTransition } from '@/core/PageTransition';
import { AlarmPopupProvider } from '@/core/AlarmPopupContext';
import AlarmPopup from '@/components/AlarmPopup';
import { PageErrorBoundary, ErrorBoundary } from '@/components/ErrorBoundary';
import MainLayout from '@/sections/MainLayout';
import LoginPage from '@/sections/LoginPage';

/* 登录页独立错误边界 */
function LoginWithBoundary() {
  return (
    <ErrorBoundary>
      <LoginPage />
    </ErrorBoundary>
  );
}
import { useAuth } from '@/hooks/useAuth';
import { initWebSocket, closeWebSocket } from '@/services/websocket.service';
import { useAlarmPopup } from '@/core/AlarmPopupContext';

function AuthGuard() {
  const { isAuthenticated } = useAuth();
  // 兼容状态更新延迟：直接检查 localStorage，避免登录后瞬间被踢回登录页
  const token = localStorage.getItem('sfp_token');
  const hasValidToken = !!token && token !== 'undefined' && token !== 'null' && token !== '';
  if (!isAuthenticated && !hasValidToken) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/* WebSocket 生命周期管理 - 接入全局报警弹窗 */
function WebSocketManager() {
  const { isAuthenticated, user } = useAuth();
  const { openAlarm } = useAlarmPopup();

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('sfp_token') || '';
      initWebSocket(token, {
        onAlarm: (alarm) => {
          console.log('[WS] Alarm:', alarm);
          // 触发全局报警弹窗
          openAlarm({
            alarm,
            unitName: alarm.unitName || '未知单位',
            unitAddress: alarm.unitAddress,
            managerName: alarm.controlRoom?.managerName,
            managerPhone: alarm.controlRoom?.managerPhone,
            dutyOfficerName: alarm.controlRoom?.dutyOfficerName,
            dutyOfficerPhone: alarm.controlRoom?.dutyOfficerPhone,
            safetyOfficerName: alarm.controlRoom?.safetyOfficerName,
            safetyOfficerPhone: alarm.controlRoom?.safetyOfficerPhone,
            snapshots: alarm.snapshots || [],
            relatedCameras: alarm.relatedCameras || [],
          });
        },
        onDeviceStatus: (device) => console.log('[WS] Device:', device),
        onError: (error) => console.error('[WS] Error:', error),
      });
    }
    return () => {
      closeWebSocket();
    };
  }, [isAuthenticated, user, openAlarm]);

  return null;
}

/* Enhanced Suspense Fallback with Skeleton */
function AppFallback() {
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

/* Routes wrapped with PageTransition */
function AnimatedRoutes() {
  return (
    <PageTransition>
      <DynamicRoutes />
    </PageTransition>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <LoadingProvider>
        <AlarmPopupProvider>
          <PageErrorBoundary>
            <WebSocketManager />
            <Routes>
              <Route path="/login" element={<LoginWithBoundary />} />
              <Route element={<AuthGuard />}>
                <Route element={<MainLayout />}>
                  <Route path="*" element={
                    <Suspense fallback={<AppFallback />}>
                      <ErrorBoundary>
                        <AnimatedRoutes />
                      </ErrorBoundary>
                    </Suspense>
                  } />
                </Route>
              </Route>
            </Routes>
            <AlarmPopup />
          </PageErrorBoundary>
        </AlarmPopupProvider>
      </LoadingProvider>
    </ToastProvider>
  );
}
