import { Routes, Route, Navigate, Outlet } from 'react-router';
import { Suspense, useEffect } from 'react';
import { DynamicRoutes } from '@/core/DynamicRoutes';
import { ToastProvider } from '@/core/ToastContext';
import { LoadingProvider } from '@/core/LoadingContext';
import { PageTransition } from '@/core/PageTransition';
import { AlarmPopupProvider } from '@/core/AlarmPopupContext';
import AlarmPopup from '@/components/AlarmPopup';
import { PageErrorBoundary, ErrorBoundary } from '@/components/ErrorBoundary';
import AppFallback from '@/components/AppFallback';
import MainLayout from '@/sections/MainLayout';
import LoginPage from '@/sections/LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { initWebSocket, closeWebSocket } from '@/services/websocket.service';
import { useAlarmPopup } from '@/core/AlarmPopupContext';
import { logger } from '@/lib/logger';

/* 登录页独立错误边界 */
function LoginWithBoundary() {
  return (
    <ErrorBoundary>
      <LoginPage />
    </ErrorBoundary>
  );
}

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
      const wsClient = initWebSocket(token, {
        onConnect: () => {
            logger.info('[WS] Connected, subscribing to topics...');
            // 订阅告警和设备状态主题
            wsClient?.subscribe('alarm');
            wsClient?.subscribe('device_status');
            wsClient?.subscribe('linkage');
          },
          onAlarm: (rawAlarm) => {
            logger.info('[WS] Alarm received');
            // WebSocket 推送的是 snake_case，映射为前端 camelCase
            const alarm = {
              id: String(rawAlarm.id ?? ''),
              alarmNo: rawAlarm.alarm_no || rawAlarm.alarmNo,
              type: typeof rawAlarm.alarm_type === 'number'
                ? (['', 'fire', 'fault', 'warning', 'supervisory', 'test'][rawAlarm.alarm_type] || 'warning')
                : (rawAlarm.type || 'warning'),
              level: typeof rawAlarm.alarm_level === 'number'
                ? (['', 'normal', 'high', 'urgent', 'low'][rawAlarm.alarm_level] || 'normal')
                : (rawAlarm.level || 'normal'),
              deviceId: String(rawAlarm.device_id || rawAlarm.deviceId || ''),
              deviceName: rawAlarm.device_name || rawAlarm.deviceName || '未知设备',
              unitId: String(rawAlarm.unit_id || rawAlarm.unitId || ''),
              unitName: rawAlarm.unit_name || rawAlarm.unitName || '未知单位',
              location: rawAlarm.location || '未知位置',
              message: rawAlarm.alarm_desc || rawAlarm.message || rawAlarm.description || '',
              status: typeof rawAlarm.status === 'number'
                ? (['new', 'confirmed', 'handled', 'ignored'][rawAlarm.status] || 'new')
                : (rawAlarm.status || 'new'),
              createdAt: rawAlarm.created_at || rawAlarm.createdAt || '',
              updatedAt: rawAlarm.updated_at || rawAlarm.updatedAt || '',
            };
            // 触发全局报警弹窗
            openAlarm({
              alarm: alarm as any,
              unitName: alarm.unitName || '未知单位',
              unitAddress: rawAlarm.unit_address || rawAlarm.unitAddress,
              managerName: rawAlarm.control_room?.managerName || rawAlarm.controlRoom?.managerName,
              managerPhone: rawAlarm.control_room?.managerPhone || rawAlarm.controlRoom?.managerPhone,
              dutyOfficerName: rawAlarm.control_room?.dutyOfficerName || rawAlarm.controlRoom?.dutyOfficerName,
              dutyOfficerPhone: rawAlarm.control_room?.dutyOfficerPhone || rawAlarm.controlRoom?.dutyOfficerPhone,
              safetyOfficerName: rawAlarm.control_room?.safetyOfficerName || rawAlarm.controlRoom?.safetyOfficerName,
              safetyOfficerPhone: rawAlarm.control_room?.safetyOfficerPhone || rawAlarm.controlRoom?.safetyOfficerPhone,
              snapshots: rawAlarm.snapshots || [],
              relatedCameras: rawAlarm.relatedCameras || [],
            });
          },
          onDeviceStatus: (device) => logger.debug('[WS] Device status:', device),
          onError: (error) => logger.error('[WS] Error:', error),
      });
    }
    return () => {
      closeWebSocket();
    };
  }, [isAuthenticated, user, openAlarm]);

  return null;
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
  // 页面加载成功时清除 chunk 重试标记，保证下次部署后仍能自动刷新
  useEffect(() => {
    sessionStorage.removeItem('chunk_retry');
  }, []);

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
                    <Suspense fallback={<AppFallback compact />}>
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