/**
 * ═══════════════════════════════════════════════════════════════════
 * 平台底层底座 - 核心类型定义
 * ═══════════════════════════════════════════════════════════════════
 */
import type { LucideIcon } from 'lucide-react';
// ReactNode available for future use

/* ── 模块生命周期状态 ── */
export type ModuleStatus = 'enabled' | 'disabled' | 'error';

/* ── 模块元数据 ── */
export interface PlatformModule {
  id: string;                    // 模块唯一标识
  name: string;                  // 模块名称
  version: string;               // 版本号
  description: string;           // 模块描述
  icon: LucideIcon;              // 模块图标
  category: ModuleCategory;      // 模块分类
  status: ModuleStatus;          // 当前状态
  path: string;                  // 路由根路径
  priority: number;              // 加载优先级

  // 菜单配置
  menu?: ModuleMenu;             // 模块菜单（可选，无则无菜单入口）

  // 数据库配置
  dbTables: string[];            // 模块数据库表列表

  // 权限配置
  permissions: ModulePermission[];

  // 依赖声明
  dependsOn?: string[];          // 依赖的其他模块ID

  // 扩展属性
  author?: string;
  createTime?: string;
  updateTime?: string;
}

/* ── 模块菜单 ── */
export interface ModuleMenu {
  label: string;
  icon: LucideIcon;
  path: string;
  children?: ModuleMenuChild[];
}

export interface ModuleMenuChild {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

/* ── 模块权限 ── */
export interface ModulePermission {
  code: string;
  name: string;
  actions: ('view' | 'create' | 'edit' | 'delete' | 'export' | 'import')[];
}

/* ── 模块分类 ── */
export type ModuleCategory =
  | 'base'      // 基础平台
  | 'monitor'   // 监控中心
  | 'manage'    // 业务管理
  | 'analyze'   // 数据分析
  | 'iot'       // IoT物联
  | 'ai'        // 智能AI
  | 'system';   // 系统管理

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  base: '基础平台',
  monitor: '监控中心',
  manage: '业务管理',
  analyze: '数据分析',
  iot: 'IoT物联',
  ai: '智能AI',
  system: '系统管理',
};

/* ── 消息总线 ── */
export interface BusMessage {
  topic: string;
  payload: unknown;
  sender: string;
  timestamp: number;
}

export type MessageHandler = (msg: BusMessage) => void;

/* ── 平台配置 ── */
export interface PlatformConfig {
  version: string;
  buildTime: string;
  theme: 'dark' | 'light';
  modules: Record<string, ModuleStatus>;
}

/* ── 模块页面组件 ── */
export interface ModulePage {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  exact?: boolean;
}

/* ── 平台底座能力清单 ── */
export interface PlatformCapabilities {
  auth: boolean;
  theme: boolean;
  apiGateway: boolean;
  messageBus: boolean;
  iotGateway: boolean;
  dbLayer: boolean;
  logAudit: boolean;
  alertCenter: boolean;
  mapEngine: boolean;
  fileStorage: boolean;
}
