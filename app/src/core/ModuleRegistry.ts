/**
 * ═══════════════════════════════════════════════════════════════
 * 智慧消防平台 - 模块注册中心
 * 必须与 Sidebar.tsx 菜单结构完全一致
 * ═══════════════════════════════════════════════════════════════
 */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Monitor, Bell, Shield, Video, Sliders, Link2,
  Building2, Cpu, Wrench, FileText, ClipboardList, Calendar, AlertCircle,
  BookOpen, MapPin, BarChart3, FileBarChart, GraduationCap, PhoneCall,
  Power, BrainCircuit, Server, AlertTriangle, Users, Settings, Activity,
  CheckSquare, Megaphone, Droplets, Zap, Wind, Maximize2, Upload, Mail,
  Clock, Store, Factory, FileCheck, ArrowRightLeft
} from 'lucide-react';

export interface ModuleMeta {
  id: string;
  name: string;
  icon: LucideIcon;
  path: string;
  category: string;
  enabled: boolean;
  version?: string;
  description?: string;
  serviceName?: string;
  dbTables?: string[];
  author?: string;
  children?: ModuleChild[];
}

export interface ModuleChild {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
}

/* ═══ 所有模块必须与 Sidebar.tsx 菜单结构完全一致 ═══ */
export const MODULES: ModuleMeta[] = [
  /* ── 1. 工作台 ── */
  {
    id: 'workbench', name: '工作台', icon: LayoutDashboard,
    path: '/workbench', category: 'base', enabled: true,
    children: [
      { id: 'workbench-home', name: '工作台首页', path: '/workbench', icon: LayoutDashboard },
      { id: 'workbench-todo', name: '我的待办', path: '/workbench/todo', icon: CheckSquare },
      { id: 'workbench-notice', name: '系统公告', path: '/workbench/notice', icon: Megaphone },
    ],
  },

  /* ── 2. 监控中心 ── */
  {
    id: 'monitor', name: '监控中心', icon: Monitor,
    path: '/monitor', category: 'monitor', enabled: true,
    children: [
      { id: 'monitor-realtime', name: '实时监控', path: '/monitor/realtime', icon: LayoutDashboard },
      { id: 'monitor-video', name: '视频监控', path: '/monitor/video', icon: Video },
      { id: 'monitor-control', name: '数智消控室', path: '/monitor/control', icon: Sliders },
      { id: 'monitor-linkage', name: '安消联动', path: '/monitor/linkage', icon: Link2 },
    ],
  },

  /* ── 3. 告警中心 ── */
  {
    id: 'alarm', name: '告警中心', icon: Bell,
    path: '/alarm', category: 'monitor', enabled: true,
    children: [
      { id: 'alarm-center', name: '告警总览', path: '/alarm/center', icon: Bell },
    ],
  },

  /* ── 4. 值守中心 ── */
  {
    id: 'duty', name: '值守中心', icon: Shield,
    path: '/duty', category: 'monitor', enabled: true,
    children: [
      { id: 'duty-dispatch', name: '接警处置', path: '/duty/dispatch', icon: PhoneCall },
      { id: 'duty-log', name: '值班日志', path: '/duty/log', icon: BookOpen },
    ],
  },

  /* ── 5. 子系统监控 ── */
  {
    id: 'subsystem', name: '子系统监控', icon: Cpu,
    path: '/subsystem', category: 'monitor', enabled: true,
    children: [
      { id: 'subsystem-water', name: '消防给水', path: '/subsystem/water', icon: Droplets },
      { id: 'subsystem-elec', name: '电气火灾', path: '/subsystem/elec', icon: Zap },
      { id: 'subsystem-vent', name: '防排烟', path: '/subsystem/vent', icon: Wind },
    ],
  },

  /* ── 6. 单位管理 ── */
  {
    id: 'unit', name: '单位管理', icon: Building2,
    path: '/unit', category: 'manage', enabled: true,
    children: [
      { id: 'unit-general', name: '一般单位', path: '/unit/general', icon: Building2 },
      { id: 'unit-key', name: '重点单位', path: '/unit/key', icon: Factory },
      { id: 'unit-nine', name: '九小场所', path: '/unit/nine-small', icon: Store },
      { id: 'unit-stats', name: '单位统计', path: '/unit/stats', icon: BarChart3 },
    ],
  },

  /* ── 7. 设备管理 ── */
  {
    id: 'device', name: '设备管理', icon: Cpu,
    path: '/device', category: 'manage', enabled: true,
    children: [
      { id: 'device-archive', name: '设备档案', path: '/device/archive', icon: Cpu },
      { id: 'device-allocate', name: '设备分配', path: '/device/allocate', icon: ArrowRightLeft },
      { id: 'device-config', name: '设备配置', path: '/device/config', icon: Settings },
      { id: 'device-maintain', name: '设备维护', path: '/device/maintain', icon: Wrench },
      { id: 'device-status', name: '设备状态', path: '/device/status', icon: Activity },

    ],
  },

  /* ── 8. 消防维保 ── */
  {
    id: 'maintenance', name: '消防维保管理', icon: Wrench,
    path: '/maintenance', category: 'manage', enabled: true,
    children: [
      { id: 'maintenance-contract', name: '维保合同', path: '/maintenance/contract', icon: FileText },
      { id: 'maintenance-company', name: '维保单位', path: '/maintenance/company', icon: Building2 },
      { id: 'maintenance-workorder', name: '维保工单', path: '/maintenance/workorder', icon: ClipboardList },
      { id: 'maintenance-record', name: '维保记录', path: '/maintenance/record', icon: Clock },
      { id: 'maintenance-stats', name: '维保统计', path: '/maintenance/stats', icon: BarChart3 },
    ],
  },

  /* ── 9. 巡检管理 ── */
  {
    id: 'patrol', name: '巡检管理', icon: MapPin,
    path: '/patrol', category: 'manage', enabled: true,
    children: [
      { id: 'patrol-plan', name: '巡检计划', path: '/patrol/plan', icon: Calendar },
      { id: 'patrol-record', name: '巡检记录', path: '/patrol/record', icon: ClipboardList },
      { id: 'patrol-hazard', name: '隐患管理', path: '/patrol/hazard', icon: AlertCircle },
    ],
  },

  /* ── 10. 应急预案 ── */
  {
    id: 'plan', name: '应急预案', icon: BookOpen,
    path: '/plan', category: 'manage', enabled: true,
    children: [
      { id: 'plan-library', name: '预案库', path: '/plan/library', icon: BookOpen },
      { id: 'plan-drill', name: '演练记录', path: '/plan/drill', icon: Calendar },
    ],
  },

  /* ── 11. GIS地图 ── */
  {
    id: 'map', name: 'GIS地图', icon: MapPin,
    path: '/map', category: 'monitor', enabled: true,
    children: [
      { id: 'map-gis', name: '地图监控', path: '/map/gis', icon: MapPin },
    ],
  },

  /* ── 12. 数据分析 ── */
  {
    id: 'analysis', name: '数据分析', icon: BarChart3,
    path: '/analysis', category: 'analyze', enabled: true,
    children: [
      { id: 'analysis-alarm', name: '报警分析', path: '/analysis/alarm', icon: BarChart3 },
      { id: 'analysis-device', name: '设备分析', path: '/analysis/device', icon: Activity },
      { id: 'analysis-trend', name: '趋势分析', path: '/analysis/trend', icon: BarChart3 },
      { id: 'analysis-report', name: '统计报表', path: '/analysis/report', icon: FileText },
    ],
  },

  /* ── 13. 报表管理 ── */
  {
    id: 'report', name: '报表管理', icon: FileBarChart,
    path: '/report', category: 'analyze', enabled: true,
    children: [
      { id: 'report-export', name: '报表导出', path: '/report/export', icon: FileBarChart },
    ],
  },

  /* ── 14. 消防知识库 ── */
  {
    id: 'knowledge', name: '消防知识库', icon: GraduationCap,
    path: '/knowledge', category: 'manage', enabled: true,
    children: [
      { id: 'knowledge-base', name: '文档中心', path: '/knowledge/base', icon: BookOpen },
    ],
  },

  /* ── 15. 大屏模式 ── */
  {
    id: 'bigscreen', name: '大屏模式', icon: Maximize2,
    path: '/bigscreen', category: 'monitor', enabled: true,
  },

  /* ── 16. 设备反控 ── */
  {
    id: 'device-control', name: '设备反控', icon: Power,
    path: '/device/control', category: 'iot', enabled: true,
  },

  /* ── 17. AI决策中心 ── */
  {
    id: 'ai', name: 'AI决策中心', icon: BrainCircuit,
    path: '/ai/center', category: 'ai', enabled: true,
  },

  /* ── 18. IoT设备接入 ── */
  {
    id: 'iot', name: 'IoT设备接入', icon: Server,
    path: '/iot', category: 'iot', enabled: true,
    children: [
      { id: 'iot-access', name: '设备接入管理', path: '/iot/access', icon: Server },
      { id: 'iot-gb28181', name: 'GB28181接入', path: '/iot/gb28181', icon: Video },
      { id: 'iot-protocol', name: '协议解析配置', path: '/iot/protocol', icon: Activity },
      { id: 'iot-pipeline', name: '数据流转管道', path: '/iot/pipeline', icon: FileText },
    ],
  },

  /* ── 19. 智能预警 ── */
  {
    id: 'smart', name: '智能预警', icon: AlertTriangle,
    path: '/smart', category: 'ai', enabled: true,
    children: [
      { id: 'smart-warning', name: '智能预警分析', path: '/smart/warning', icon: AlertTriangle },
    ],
  },

  /* ── 20. 培训考核 ── */
  {
    id: 'training', name: '培训考核', icon: GraduationCap,
    path: '/training', category: 'manage', enabled: true,
    children: [
      { id: 'training-manage', name: '培训管理', path: '/training/manage', icon: GraduationCap },
    ],
  },

  /* ── 21. 消防检查 ── */
  {
    id: 'fire-check', name: '消防检查', icon: Shield,
    path: '/fire-check', category: 'manage', enabled: true,
    children: [
      { id: 'fire-check-manage', name: '检查管理', path: '/fire-check/manage', icon: FileCheck },
    ],
  },

  /* ── 22. 系统管理 ── */
  {
    id: 'system', name: '系统管理', icon: Settings,
    path: '/system', category: 'system', enabled: true,
    children: [
      { id: 'system-user', name: '用户管理', path: '/system/user', icon: Users },
      { id: 'system-role', name: '角色权限', path: '/system/role', icon: Shield },
      { id: 'system-org', name: '组织架构', path: '/system/org', icon: Building2 },
      { id: 'system-log', name: '日志管理', path: '/system/log', icon: FileText },
      { id: 'system-config', name: '系统配置', path: '/system/config', icon: Settings },
      { id: 'system-data', name: '数据导入导出', path: '/system/data', icon: Upload },
      { id: 'system-notify', name: '通知模板', path: '/system/notify', icon: Mail },
      { id: 'system-monitor', name: '性能监控', path: '/system/monitor', icon: Activity },
    ],
  },
];

/* ── 辅助函数 ── */
export function getModuleById(id: string): ModuleMeta | undefined {
  return MODULES.find(m => m.id === id);
}

export function getModuleCategories(): Record<string, string> {
  return {
    base: '基础平台', monitor: '监控中心', manage: '业务管理',
    analyze: '数据分析', ai: '智能AI', iot: 'IoT物联', system: '系统管理',
  };
}
