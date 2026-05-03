/**
 * ═══════════════════════════════════════════════════════════════════
 * 页面面包屑 + 返回按钮导航
 * 
 * 根据当前路由自动解析出导航层级，提供：
 * - 面包屑路径展示（首页 > 一级菜单 > 二级菜单）
 * - 返回按钮（在非首页页面显示）
 * - 点击面包屑可快速跳转
 * ═══════════════════════════════════════════════════════════════════
 */
import { useNavigate, useLocation } from 'react-router';
import { Home, ChevronRight, ArrowLeft } from 'lucide-react';
import { ModuleEngine } from '@/core/platform';
import { useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

export default function PageBreadcrumb() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // 根据当前路径解析面包屑
  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    if (pathname === '/workbench' || pathname === '/') {
      return [{ label: '工作台首页', path: '/workbench', isLast: true }];
    }

    const enabledModules = ModuleEngine.getMenuModules();
    const items: BreadcrumbItem[] = [];

    // 查找当前路径所属模块
    for (const mod of enabledModules) {
      if (!mod.menu) continue;

      const menuPath = mod.menu.path || mod.path || '';
      const children = mod.menu.children || [];

      // 检查是否匹配子菜单
      const matchedChild = children.find(c => pathname === c.path || pathname.startsWith(c.path + '/'));

      if (matchedChild) {
        // 首页
        items.push({ label: '首页', path: '/workbench', isLast: false });
        // 父级菜单
        items.push({ label: mod.menu.label || mod.name, path: menuPath, isLast: false });
        // 当前页面
        items.push({ label: matchedChild.label, path: matchedChild.path, isLast: true });
        return items;
      }

      // 检查是否匹配父级路径本身
      if (pathname === menuPath || pathname === mod.path) {
        items.push({ label: '首页', path: '/workbench', isLast: false });
        items.push({ label: mod.menu.label || mod.name, path: menuPath, isLast: true });
        return items;
      }
    }

    // 兜底：简单路径解析
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return [{ label: '工作台首页', path: '/workbench', isLast: true }];
    }

    items.push({ label: '首页', path: '/workbench', isLast: false });

    let buildPath = '';
    segments.forEach((seg, idx) => {
      buildPath += '/' + seg;
      const label = MODULE_PATH_LABELS[buildPath] || seg;
      items.push({
        label,
        path: buildPath,
        isLast: idx === segments.length - 1,
      });
    });

    return items;
  }, [pathname]);

  // 是否有上级页面可返回
  const canGoBack = pathname !== '/workbench' && pathname !== '/';

  // 返回上一页
  const goBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/workbench');
    }
  };

  return (
    <div className="flex items-center gap-3 mb-4 px-1">
      {/* 返回按钮 */}
      {canGoBack && (
        <button
          onClick={goBack}
          title="返回上一页"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 
                     hover:text-slate-200 hover:bg-slate-800/60 transition-all border border-slate-700/30
                     hover:border-slate-600/50 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>返回</span>
        </button>
      )}

      {/* 面包屑 */}
      <nav className="flex items-center flex-wrap gap-1">
        {breadcrumbs.map((item, idx) => (
          <div key={item.path + idx} className="flex items-center">
            {idx > 0 && (
              <ChevronRight className="w-3 h-3 text-slate-600 mx-1 flex-shrink-0" />
            )}
            {item.isLast ? (
              <span className="text-[11px] font-medium text-blue-400 flex items-center gap-1">
                {idx === 0 && <Home className="w-3 h-3" />}
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => navigate(item.path)}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                {idx === 0 && <Home className="w-3 h-3" />}
                {item.label}
              </button>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   常见路径标签映射（兜底解析用）
   ═══════════════════════════════════════════════════════════════ */
const MODULE_PATH_LABELS: Record<string, string> = {
  '/workbench': '工作台',
  '/workbench/todo': '我的待办',
  '/workbench/notice': '系统公告',
  '/monitor': '监控中心',
  '/monitor/realtime': '实时监控',
  '/monitor/video': '视频监控',
  '/monitor/control': '数智消控室',
  '/monitor/control/room': '消控室详情',
  '/monitor/linkage': '安消联动',
  '/monitor/subsys': '子系统监控',
  '/alarm': '告警中心',
  '/alarm/center': '告警总览',
  '/duty': '值守中心',
  '/duty/dispatch': '接警处置',
  '/duty/log': '值班日志',
  '/subsystem': '子系统监控',
  '/subsystem/water': '消防给水',
  '/subsystem/elec': '电气火灾',
  '/subsystem/vent': '防排烟',
  '/unit': '单位管理',
  '/unit/general': '一般单位',
  '/unit/key': '重点单位',
  '/unit/nine-small': '九小场所',
  '/unit/stats': '单位统计',
  '/device': '设备管理',
  '/device/archive': '设备档案',
  '/device/allocate': '设备分配',
  '/device/config': '设备配置',
  '/device/maintain': '设备维护',
  '/device/status': '设备状态',
  '/device/control': '设备反控',
  '/maintenance': '消防维保',
  '/maintenance/contract': '维保合同',
  '/maintenance/company': '维保单位',
  '/maintenance/workorder': '维保工单',
  '/maintenance/record': '维保记录',
  '/maintenance/stats': '维保统计',
  '/patrol': '巡检管理',
  '/patrol/plan': '巡检计划',
  '/patrol/record': '巡检记录',
  '/patrol/hazard': '隐患管理',
  '/plan': '应急预案',
  '/plan/library': '预案库',
  '/plan/drill': '演练记录',
  '/map': 'GIS地图',
  '/map/gis': '地图监控',
  '/analysis': '数据分析',
  '/analysis/alarm': '报警分析',
  '/analysis/device': '设备分析',
  '/analysis/trend': '趋势分析',
  '/analysis/report': '统计报表',
  '/report': '报表管理',
  '/report/export': '报表导出',
  '/knowledge': '消防知识库',
  '/knowledge/base': '文档中心',
  '/bigscreen': '大屏模式',
  '/ai': 'AI决策中心',
  '/ai/center': 'AI决策中心',
  '/iot': 'IoT设备接入',
  '/iot/access': '设备接入管理',
  '/iot/protocol': '协议解析配置',
  '/iot/pipeline': '数据流转管道',
  '/smart': '智能预警',
  '/smart/warning': '智能预警分析',
  '/training': '培训考核',
  '/training/manage': '培训管理',
  '/fire-check': '消防检查',
  '/fire-check/manage': '检查管理',
  '/system': '系统管理',
  '/system/user': '用户管理',
  '/system/role': '角色权限',
  '/system/org': '组织架构',
  '/system/log': '日志管理',
  '/system/config': '系统配置',
  '/system/data': '数据导入导出',
  '/system/notify': '通知模板',
  '/system/monitor': '性能监控',
  '/system/module': '模块配置中心',
};
