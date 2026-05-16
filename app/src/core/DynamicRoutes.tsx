/**
 * ═══════════════════════════════════════════════════════════════════
 * 动态路由系统 - 基于 ModuleEngine 动态生成
 * 
 * 核心特性：
 * - 根据 ModuleEngine.getEnabledModules() 自动构建路由表
 * - 模块禁用后路由自动剔除
 * - 保持 React.lazy 代码分割，每个页面独立 chunk
 * - 支持一级路由和二级子路由自动展开
 * ═══════════════════════════════════════════════════════════════════
 */
import { lazy, useState, useEffect, useMemo, type ComponentType, type LazyExoticComponent } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { ModuleEngine } from '@/core/platform';
import type { PlatformModule } from '@/core/platform';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/* 带自动重试的 lazy 加载器 —— 解决部署后 chunk 缓存导致的加载失败 */
function lazyWithRetry(factory: () => Promise<{ default: ComponentType<object> }>) {
  return lazy(() => {
    return factory().catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('Failed to fetch dynamically imported module')) {
        if (!sessionStorage.getItem('chunk_retry')) {
          sessionStorage.setItem('chunk_retry', '1');
          window.location.reload();
          // 永远不会走到这里，因为页面刷新了
          return Promise.reject(error);
        }
      }
      return Promise.reject(error);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   页面组件静态映射表 - 编译时确定，支持代码分割
   key 必须与 ModuleRegistry 中定义的 path 完全匹配
   ═══════════════════════════════════════════════════════════════ */

const PAGE_COMPONENTS: Record<string, LazyExoticComponent<ComponentType<object>>> = {
  /* ── 工作台 workbench ── */
  '/workbench': lazyWithRetry(() => import('@/sections/WorkbenchPage')),
  '/workbench/todo': lazyWithRetry(() => import('@/sections/TodoListPage')),
  '/workbench/notice': lazyWithRetry(() => import('@/sections/NoticePage')),

  /* ── 监控中心 monitor ── */
  '/monitor/realtime': lazyWithRetry(() => import('@/sections/FireMonitorPage')),
  '/monitor/video': lazyWithRetry(() => import('@/sections/VideoMonitorPage')),
  '/monitor/control': lazyWithRetry(() => import('@/sections/FireControlRoomListPage')),
  '/monitor/control/room/:roomId': lazyWithRetry(() => import('@/sections/FireControlRoomPage')),
  '/monitor/control/host-code': lazyWithRetry(() => import('@/sections/HostDeviceCodePage')),
  '/monitor/linkage': lazyWithRetry(() => import('@/sections/SafetyLinkagePage')),
  '/monitor/subsys': lazyWithRetry(() => import('@/sections/SubSystemPage')),

  /* ── 告警中心 alarm ── */
  '/alarm/center': lazyWithRetry(() => import('@/sections/AlarmCenterPage')),

  /* ── 值守中心 duty ── */
  '/duty/dispatch': lazyWithRetry(() => import('@/sections/AlarmDispatchPage')),
  '/duty/log': lazyWithRetry(() => import('@/sections/SystemLogPage')),
  '/duty/shift': lazyWithRetry(() => import('@/sections/DutyShiftPage')),
  '/duty/handover': lazyWithRetry(() => import('@/sections/HandoverPage')),

  /* ── 子系统监控 subsystem ── */
  '/subsystem/water': lazyWithRetry(() => import('@/sections/SubSystemPage')),
  '/subsystem/elec': lazyWithRetry(() => import('@/sections/SubSystemPage')),
  '/subsystem/vent': lazyWithRetry(() => import('@/sections/SubSystemPage')),

  /* ── 单位管理 unit ── */
  '/unit/general': lazyWithRetry(() => import('@/sections/UnitArchivePage')),
  '/unit/key': lazyWithRetry(() => import('@/sections/UnitArchivePage')),
  '/unit/nine-small': lazyWithRetry(() => import('@/sections/UnitArchivePage')),
  '/unit/stats': lazyWithRetry(() => import('@/sections/UnitStatsPage')),
  '/floor-plans': lazyWithRetry(() => import('@/sections/FloorPlanPage')),

  /* ── 设备管理 device（入库管理为唯一菜单入口，其余页面保留路由供档案页快捷跳转） ── */
  '/device/archive': lazyWithRetry(() => import('@/sections/DeviceArchivePage')),
  '/device/access': lazyWithRetry(() => import('@/sections/DeviceAccessPage')),
  '/device/access/ctwing': lazyWithRetry(() => import('@/sections/Ctwing4gAccessPage')),
  '/device/allocate': lazyWithRetry(() => import('@/sections/DeviceAllocationPage')),
  '/device/config': lazyWithRetry(() => import('@/sections/DeviceConfigPage')),
  '/device/maintain': lazyWithRetry(() => import('@/sections/DeviceMaintainPage')),


  /* ── 消防维保 maintenance ── */
  '/maintenance/contract': lazyWithRetry(() => import('@/sections/MaintenanceContractPage')),
  '/maintenance/company': lazyWithRetry(() => import('@/sections/MaintenanceCompanyPage')),
  '/maintenance/workorder': lazyWithRetry(() => import('@/sections/MaintenanceWorkOrderPage')),
  '/maintenance/record': lazyWithRetry(() => import('@/sections/MaintenanceRecordPage')),
  '/maintenance/stats': lazyWithRetry(() => import('@/sections/MaintenanceStatsPage')),

  /* ── 巡检管理 patrol ── */
  '/patrol/plan': lazyWithRetry(() => import('@/sections/PatrolPlanPage')),
  '/patrol/record': lazyWithRetry(() => import('@/sections/PatrolRecordPage')),
  '/patrol/hazard': lazyWithRetry(() => import('@/sections/HazardPage')),

  /* ── 应急预案 plan ── */
  '/plan/library': lazyWithRetry(() => import('@/sections/PlanLibraryPage')),
  '/plan/drill': lazyWithRetry(() => import('@/sections/PlanDrillPage')),

  /* ── GIS地图 map ── */
  '/map/gis': lazyWithRetry(() => import('@/sections/GISMapPage')),

  /* ── 数据分析 analysis ── */
  '/analysis/alarm': lazyWithRetry(() => import('@/sections/AnalysisReportPage')),
  '/analysis/device': lazyWithRetry(() => import('@/sections/DeviceAnalysisPage')),
  '/analysis/trend': lazyWithRetry(() => import('@/sections/AnalysisTrendPage')),
  '/analysis/report': lazyWithRetry(() => import('@/sections/AnalysisReportPage')),

  /* ── 报表管理 report ── */
  '/report/export': lazyWithRetry(() => import('@/sections/ReportExportPage')),

  /* ── 消防知识库 knowledge ── */
  '/knowledge/base': lazyWithRetry(() => import('@/sections/KnowledgePage')),

  /* ── 大屏模式 bigscreen ── */
  '/bigscreen': lazyWithRetry(() => import('@/sections/ScreenDashboardPage')),

  /* ── 设备反控 device-control ── */
  '/device/control': lazyWithRetry(() => import('@/sections/DeviceControlPage')),

  /* ── AI决策中心 ai ── */
  '/ai/center': lazyWithRetry(() => import('@/sections/AIDecisionPage')),

  /* ── IoT设备接入 iot（设备物理接入已迁至 /device/access，此处保留兼容重定向） ── */
  '/iot/access': lazyWithRetry(() => import('@/sections/DeviceAccessRedirect')),
  '/iot/protocol': lazyWithRetry(() => import('@/sections/ProtocolConfigPage')),
  '/iot/pipeline': lazyWithRetry(() => import('@/sections/DataPipelinePage')),
  '/iot/gb28181': lazyWithRetry(() => import('@/sections/GB28181Page')),

  /* ── 智能预警 smart ── */
  '/smart/warning': lazyWithRetry(() => import('@/sections/SmartAlertPage')),

  /* ── 培训考核 training ── */
  '/training/manage': lazyWithRetry(() => import('@/sections/TrainingPage')),

  /* ── 消防检查 fire-check ── */
  '/fire-check/manage': lazyWithRetry(() => import('@/sections/FireCheckPage')),

  /* ── 系统管理 system ── */
  '/system/user': lazyWithRetry(() => import('@/sections/SystemUserPage')),
  '/system/personnel': lazyWithRetry(() => import('@/sections/PersonnelPage')),
  '/system/role': lazyWithRetry(() => import('@/sections/SystemRolePage')),
  '/system/org': lazyWithRetry(() => import('@/sections/SystemOrgPage')),
  '/system/log': lazyWithRetry(() => import('@/sections/SystemLogPage')),
  '/system/config': lazyWithRetry(() => import('@/sections/SystemConfigPage')),
  '/system/data': lazyWithRetry(() => import('@/sections/DataImportExportPage')),
  '/system/notify': lazyWithRetry(() => import('@/sections/NotifyTemplatePage')),
  '/system/monitor': lazyWithRetry(() => import('@/sections/SystemMonitorPage')),
  '/system/module': lazyWithRetry(() => import('@/sections/ModuleConfigPage')),
};

/* ═══════════════════════════════════════════════════════════════
   路径提取工具：从模块注册表中提取所有需要路由的路径
   ═══════════════════════════════════════════════════════════════ */

function extractPathsFromModules(modules: PlatformModule[]): string[] {
  const paths: string[] = [];

  for (const mod of modules) {
    // 模块根路径
    if (mod.path) {
      paths.push(mod.path);
    }

    // 菜单子路径
    if (mod.menu?.children) {
      for (const child of mod.menu.children) {
        if (child.path) {
          paths.push(child.path);
        }
      }
    }
  }

  // 去重并排序（长路径优先，确保子路由不被父路由吞没）
  return [...new Set(paths)].sort((a, b) => b.length - a.length);
}

/* 为模块查找最佳默认路由 */
function getModuleDefaultPath(mod: PlatformModule): string | null {
  if (!mod.menu) return mod.path || null;
  // 有子菜单时返回第一个子菜单路径
  if (mod.menu.children?.length) {
    return mod.menu.children[0].path;
  }
  return mod.menu.path || mod.path || null;
}

/* ═══════════════════════════════════════════════════════════════
   动态路由组件
   ═══════════════════════════════════════════════════════════════ */

export function DynamicRoutes() {
  const [tick, forceUpdate] = useState(0);

  // 订阅模块状态变化，自动重新渲染路由
  useEffect(() => {
    const unsubscribe = ModuleEngine.subscribe(() => {
      forceUpdate(v => v + 1);
    });
    return unsubscribe;
  }, []);

  // 基于启用的模块计算路由配置（tick 变化时重新计算）
  const { routes, redirectRoutes } = useMemo(() => {
    void tick;
    const enabledModules = ModuleEngine.getEnabledModules();
    const paths = extractPathsFromModules(enabledModules);

    const routeList: { path: string; component: LazyExoticComponent<ComponentType<object>> }[] = [];
    const redirectList: { from: string; to: string }[] = [];

    // 为每个提取的路径匹配组件
    for (const path of paths) {
      const Component = PAGE_COMPONENTS[path];
      if (Component) {
        routeList.push({ path, component: Component });
      }
    }

    // 手动添加非菜单参数化路由（详情页等）
    const extraPaths = [
      '/monitor/control/room/:roomId',
      '/monitor/control/host-code',
    ];
    for (const path of extraPaths) {
      const Component = PAGE_COMPONENTS[path];
      if (Component && !routeList.some(r => r.path === path)) {
        routeList.push({ path, component: Component });
      }
    }

    // 为每个模块生成默认重定向（如 /monitor → /monitor/realtime）
    for (const mod of enabledModules) {
      const modPath = mod.path;
      const defaultPath = getModuleDefaultPath(mod);
      if (modPath && defaultPath && modPath !== defaultPath) {
        // 检查是否已存在该路径的精确路由
        const hasExactRoute = routeList.some(r => r.path === modPath);
        if (!hasExactRoute) {
          redirectList.push({ from: modPath, to: defaultPath });
        }
      }
    }

    return { routes: routeList, redirectRoutes: redirectList };
  }, [tick]);

  // 如果没有任何启用的模块，显示空状态
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
        <div className="text-6xl opacity-20">&#9888;</div>
        <div className="text-lg font-medium">没有启用的业务模块</div>
        <div className="text-sm">请前往「系统管理 → 模块配置中心」启用所需模块</div>
      </div>
    );
  }

  // 兜底：选择第一个启用的模块默认路径（workbench 被禁用时不会空白）
  const fallbackPath = redirectRoutes[0]?.to || routes[0]?.path || '/workbench';

  return (
    <Routes>
      {routes.map(({ path, component: Component }) => (
        <Route key={path} path={path} element={
          <ErrorBoundary>
            <Component />
          </ErrorBoundary>
        } />
      ))}

      {redirectRoutes.map(({ from, to }) => (
        <Route
          key={`redirect-${from}`}
          path={from}
          element={<Navigate to={to} replace />}
        />
      ))}

      {/* 兜底重定向到第一个可用模块 */}
      <Route path="*" element={<Navigate to={fallbackPath} replace />} />
    </Routes>
  );
}

export default DynamicRoutes;
