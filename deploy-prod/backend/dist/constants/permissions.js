"use strict";
/**
 * ═══════════════════════════════════════════════════════════════════
 * 权限码常量定义 —— 前后端共用来源
 *
 * ⚠️ 单一可信来源：所有权限码必须在此定义，禁止在代码中硬编码权限字符串。
 * 修改流程：
 *   1. 修改此文件
 *   2. 同步到 app/src/constants/permissions.ts
 *   3. 同步到 seeders/index.ts（如果新增权限需要初始化到数据库）
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionGroups = exports.PERMISSION_TYPES = exports.PERMISSION_NAMES = exports.PERMISSION_CODES = void 0;
exports.isValidPermissionCode = isValidPermissionCode;
/** 所有权限码数组 —— 用于遍历、校验、生成菜单 */
exports.PERMISSION_CODES = [
    // 工作台
    'workbench:view', 'workbench:manage',
    // 监控中心
    'monitor:view', 'monitor:control',
    // 告警中心
    'alarm:view', 'alarm:handle', 'alarm:config',
    // 单位管理
    'unit:view', 'unit:create', 'unit:edit', 'unit:delete',
    // 设备管理
    'device:view', 'device:create', 'device:edit', 'device:delete',
    'device-control:view', 'device-control:operate',
    // 维保管理
    'maintenance:view', 'maintenance:dispatch',
    // 巡检管理
    'patrol:view', 'patrol:manage',
    // 系统管理
    'system:view', 'system:admin',
    'system:user:view', 'system:user:create', 'system:user:edit', 'system:user:delete',
    'system:role:view', 'system:role:create', 'system:role:edit', 'system:role:delete',
    // 大屏
    'bigscreen:view',
    // AI
    'ai:view', 'ai:operate',
    // IoT
    'iot:view', 'iot:manage',
    // 知识库
    'knowledge:view', 'knowledge:manage',
    // 报表
    'report:view', 'report:export',
    // 地图
    'map:view',
    // 数据分析
    'analysis:view', 'analysis:export',
    // 子系统
    'subsystem:view',
    // 智能预警
    'smart:view', 'smart:manage',
    // 培训
    'training:view', 'training:manage',
    // 消防检查
    'inspection:view', 'inspection:manage',
    'fire-check:view', 'fire-check:manage',
    // 联动
    'linkage:view', 'linkage:manage',
    // 值守
    'duty:view', 'duty:manage',
    // 预案
    'plan:view', 'plan:manage',
];
/** 权限码 → 显示名称映射 */
exports.PERMISSION_NAMES = {
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
/** 权限类型：1=菜单权限 2=操作权限 */
exports.PERMISSION_TYPES = {
    // 菜单权限 (type=1)
    'workbench:view': 1, 'monitor:view': 1, 'alarm:view': 1, 'unit:view': 1,
    'device:view': 1, 'maintenance:view': 1, 'patrol:view': 1, 'system:view': 1,
    'system:user:view': 1, 'system:role:view': 1, 'bigscreen:view': 1, 'ai:view': 1,
    'iot:view': 1, 'knowledge:view': 1, 'report:view': 1, 'map:view': 1,
    'analysis:view': 1, 'subsystem:view': 1, 'smart:view': 1, 'training:view': 1,
    'inspection:view': 1, 'fire-check:view': 1, 'linkage:view': 1, 'duty:view': 1,
    'plan:view': 1, 'device-control:view': 1,
    // 操作权限 (type=2)
    'workbench:manage': 2, 'monitor:control': 2, 'alarm:handle': 2, 'alarm:config': 2,
    'unit:create': 2, 'unit:edit': 2, 'unit:delete': 2,
    'device:create': 2, 'device:edit': 2, 'device:delete': 2, 'device-control:operate': 2,
    'maintenance:dispatch': 2, 'patrol:manage': 2, 'system:admin': 2,
    'system:user:create': 2, 'system:user:edit': 2, 'system:user:delete': 2,
    'system:role:create': 2, 'system:role:edit': 2, 'system:role:delete': 2,
    'ai:operate': 2, 'iot:manage': 2, 'knowledge:manage': 2,
    'report:export': 2, 'analysis:export': 2, 'smart:manage': 2,
    'training:manage': 2, 'inspection:manage': 2, 'fire-check:manage': 2,
    'linkage:manage': 2, 'duty:manage': 2, 'plan:manage': 2,
};
/** 按模块分组的权限 —— 方便业务代码引用 */
exports.PermissionGroups = {
    workbench: ['workbench:view', 'workbench:manage'],
    monitor: ['monitor:view', 'monitor:control'],
    alarm: ['alarm:view', 'alarm:handle', 'alarm:config'],
    unit: ['unit:view', 'unit:create', 'unit:edit', 'unit:delete'],
    device: ['device:view', 'device:create', 'device:edit', 'device:delete', 'device-control:view', 'device-control:operate'],
    maintenance: ['maintenance:view', 'maintenance:dispatch'],
    patrol: ['patrol:view', 'patrol:manage'],
    system: ['system:view', 'system:admin', 'system:user:view', 'system:user:create', 'system:user:edit', 'system:user:delete', 'system:role:view', 'system:role:create', 'system:role:edit', 'system:role:delete'],
    bigscreen: ['bigscreen:view'],
    ai: ['ai:view', 'ai:operate'],
    iot: ['iot:view', 'iot:manage'],
    knowledge: ['knowledge:view', 'knowledge:manage'],
    report: ['report:view', 'report:export'],
    map: ['map:view'],
    analysis: ['analysis:view', 'analysis:export'],
    subsystem: ['subsystem:view'],
    smart: ['smart:view', 'smart:manage'],
    training: ['training:view', 'training:manage'],
    inspection: ['inspection:view', 'inspection:manage', 'fire-check:view', 'fire-check:manage'],
    linkage: ['linkage:view', 'linkage:manage'],
    duty: ['duty:view', 'duty:manage'],
    plan: ['plan:view', 'plan:manage'],
};
/** 校验字符串是否为合法权限码 */
function isValidPermissionCode(code) {
    return exports.PERMISSION_CODES.includes(code);
}
//# sourceMappingURL=permissions.js.map