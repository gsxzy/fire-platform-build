/**
 * ═══════════════════════════════════════════════════════════════════
 * 权限码常量定义 —— 前端版本
 *
 * ⚠️ 单一可信来源：所有权限码必须在此定义，禁止在代码中硬编码权限字符串。
 * 修改流程：
 *   1. 修改 backend/src/constants/permissions.ts（主定义）
 *   2. 同步到此文件
 * ═══════════════════════════════════════════════════════════════════
 */

/** 权限码联合类型 —— 用于 TypeScript 类型检查 */
export type PermissionCode =
  // ── 工作台 ──
  | 'workbench:view' | 'workbench:manage'
  // ── 监控中心 ──
  | 'monitor:view' | 'monitor:control'
  // ── 告警中心 ──
  | 'alarm:view' | 'alarm:handle' | 'alarm:config'
  // ── 单位管理 ──
  | 'unit:view' | 'unit:create' | 'unit:edit' | 'unit:delete'
  // ── 设备管理 ──
  | 'device:view' | 'device:create' | 'device:edit' | 'device:delete'
  | 'device-control:view' | 'device-control:operate'
  // ── 维保管理 ──
  | 'maintenance:view' | 'maintenance:dispatch'
  // ── 巡检管理 ──
  | 'patrol:view' | 'patrol:manage'
  // ── 系统管理 ──
  | 'system:view' | 'system:admin'
  | 'system:user:view' | 'system:user:create' | 'system:user:edit' | 'system:user:delete'
  | 'system:role:view' | 'system:role:create' | 'system:role:edit' | 'system:role:delete'
  // ── 大屏模式 ──
  | 'bigscreen:view'
  // ── AI决策 ──
  | 'ai:view' | 'ai:operate'
  // ── IoT管理 ──
  | 'iot:view' | 'iot:manage'
  // ── 知识库 ──
  | 'knowledge:view' | 'knowledge:manage'
  // ── 报表 ──
  | 'report:view' | 'report:export'
  // ── GIS地图 ──
  | 'map:view'
  // ── 数据分析 ──
  | 'analysis:view' | 'analysis:export'
  // ── 子系统监控 ──
  | 'subsystem:view'
  // ── 智能预警 ──
  | 'smart:view' | 'smart:manage'
  // ── 培训考核 ──
  | 'training:view' | 'training:manage'
  // ── 消防检查 ──
  | 'inspection:view' | 'inspection:manage'
  | 'fire-check:view' | 'fire-check:manage'
  // ── 联动规则 ──
  | 'linkage:view' | 'linkage:manage'
  // ── 值守中心 ──
  | 'duty:view' | 'duty:manage'
  // ── 预案 ──
  | 'plan:view' | 'plan:manage';

/** 所有权限码数组 */
export const PERMISSION_CODES: PermissionCode[] = [
  'workbench:view', 'workbench:manage',
  'monitor:view', 'monitor:control',
  'alarm:view', 'alarm:handle', 'alarm:config',
  'unit:view', 'unit:create', 'unit:edit', 'unit:delete',
  'device:view', 'device:create', 'device:edit', 'device:delete',
  'device-control:view', 'device-control:operate',
  'maintenance:view', 'maintenance:dispatch',
  'patrol:view', 'patrol:manage',
  'system:view', 'system:admin',
  'system:user:view', 'system:user:create', 'system:user:edit', 'system:user:delete',
  'system:role:view', 'system:role:create', 'system:role:edit', 'system:role:delete',
  'bigscreen:view',
  'ai:view', 'ai:operate',
  'iot:view', 'iot:manage',
  'knowledge:view', 'knowledge:manage',
  'report:view', 'report:export',
  'map:view',
  'analysis:view', 'analysis:export',
  'subsystem:view',
  'smart:view', 'smart:manage',
  'training:view', 'training:manage',
  'inspection:view', 'inspection:manage',
  'fire-check:view', 'fire-check:manage',
  'linkage:view', 'linkage:manage',
  'duty:view', 'duty:manage',
  'plan:view', 'plan:manage',
];

/** 权限码 → 显示名称映射 */
export const PERMISSION_NAMES: Record<PermissionCode, string> = {
  'workbench:view': '工作台', 'workbench:manage': '工作台管理',
  'monitor:view': '监控中心', 'monitor:control': '监控反控',
  'alarm:view': '告警中心', 'alarm:handle': '告警处理', 'alarm:config': '告警配置',
  'unit:view': '单位管理', 'unit:create': '单位新增', 'unit:edit': '单位编辑', 'unit:delete': '单位删除',
  'device:view': '设备管理', 'device:create': '设备新增', 'device:edit': '设备编辑', 'device:delete': '设备删除',
  'device-control:view': '设备反控查看', 'device-control:operate': '设备反控操作',
  'maintenance:view': '维保管理', 'maintenance:dispatch': '工单派单',
  'patrol:view': '巡检管理', 'patrol:manage': '巡检管理',
  'system:view': '系统管理', 'system:admin': '人员管理',
  'system:user:view': '用户管理', 'system:user:create': '用户新增', 'system:user:edit': '用户编辑', 'system:user:delete': '用户删除',
  'system:role:view': '角色管理', 'system:role:create': '角色新增', 'system:role:edit': '角色编辑', 'system:role:delete': '角色删除',
  'bigscreen:view': '大屏模式',
  'ai:view': 'AI决策', 'ai:operate': 'AI操作',
  'iot:view': 'IoT管理', 'iot:manage': 'IoT管理',
  'knowledge:view': '知识库', 'knowledge:manage': '知识库管理',
  'report:view': '报表查看', 'report:export': '报表导出',
  'map:view': 'GIS地图',
  'analysis:view': '数据分析', 'analysis:export': '数据导出',
  'subsystem:view': '子系统监控',
  'smart:view': '智能预警', 'smart:manage': '智能预警管理',
  'training:view': '培训考核', 'training:manage': '培训考核管理',
  'inspection:view': '消防检查', 'inspection:manage': '消防检查管理',
  'fire-check:view': '消防检查', 'fire-check:manage': '消防检查管理',
  'linkage:view': '联动规则', 'linkage:manage': '联动规则管理',
  'duty:view': '值守中心', 'duty:manage': '值守管理',
  'plan:view': '预案管理', 'plan:manage': '预案管理',
};

/** 按模块分组的权限 */
export const PermissionGroups = {
  workbench: ['workbench:view', 'workbench:manage'] as PermissionCode[],
  monitor: ['monitor:view', 'monitor:control'] as PermissionCode[],
  alarm: ['alarm:view', 'alarm:handle', 'alarm:config'] as PermissionCode[],
  unit: ['unit:view', 'unit:create', 'unit:edit', 'unit:delete'] as PermissionCode[],
  device: ['device:view', 'device:create', 'device:edit', 'device:delete', 'device-control:view', 'device-control:operate'] as PermissionCode[],
  maintenance: ['maintenance:view', 'maintenance:dispatch'] as PermissionCode[],
  patrol: ['patrol:view', 'patrol:manage'] as PermissionCode[],
  system: ['system:view', 'system:admin', 'system:user:view', 'system:user:create', 'system:user:edit', 'system:user:delete', 'system:role:view', 'system:role:create', 'system:role:edit', 'system:role:delete'] as PermissionCode[],
  bigscreen: ['bigscreen:view'] as PermissionCode[],
  ai: ['ai:view', 'ai:operate'] as PermissionCode[],
  iot: ['iot:view', 'iot:manage'] as PermissionCode[],
  knowledge: ['knowledge:view', 'knowledge:manage'] as PermissionCode[],
  report: ['report:view', 'report:export'] as PermissionCode[],
  map: ['map:view'] as PermissionCode[],
  analysis: ['analysis:view', 'analysis:export'] as PermissionCode[],
  subsystem: ['subsystem:view'] as PermissionCode[],
  smart: ['smart:view', 'smart:manage'] as PermissionCode[],
  training: ['training:view', 'training:manage'] as PermissionCode[],
  inspection: ['inspection:view', 'inspection:manage', 'fire-check:view', 'fire-check:manage'] as PermissionCode[],
  linkage: ['linkage:view', 'linkage:manage'] as PermissionCode[],
  duty: ['duty:view', 'duty:manage'] as PermissionCode[],
  plan: ['plan:view', 'plan:manage'] as PermissionCode[],
};

/** 校验字符串是否为合法权限码 */
export function isValidPermissionCode(code: string): code is PermissionCode {
  return PERMISSION_CODES.includes(code as PermissionCode);
}
