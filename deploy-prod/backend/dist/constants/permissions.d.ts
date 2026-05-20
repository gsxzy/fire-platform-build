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
/** 权限码联合类型 —— 用于 TypeScript 类型检查 */
export type PermissionCode = 'workbench:view' | 'workbench:manage' | 'monitor:view' | 'monitor:control' | 'alarm:view' | 'alarm:handle' | 'alarm:config' | 'unit:view' | 'unit:create' | 'unit:edit' | 'unit:delete' | 'device:view' | 'device:create' | 'device:edit' | 'device:delete' | 'device-control:view' | 'device-control:operate' | 'maintenance:view' | 'maintenance:dispatch' | 'patrol:view' | 'patrol:manage' | 'system:view' | 'system:admin' | 'system:user:view' | 'system:user:create' | 'system:user:edit' | 'system:user:delete' | 'system:role:view' | 'system:role:create' | 'system:role:edit' | 'system:role:delete' | 'bigscreen:view' | 'ai:view' | 'ai:operate' | 'iot:view' | 'iot:manage' | 'knowledge:view' | 'knowledge:manage' | 'report:view' | 'report:export' | 'map:view' | 'analysis:view' | 'analysis:export' | 'subsystem:view' | 'smart:view' | 'smart:manage' | 'training:view' | 'training:manage' | 'inspection:view' | 'inspection:manage' | 'fire-check:view' | 'fire-check:manage' | 'linkage:view' | 'linkage:manage' | 'duty:view' | 'duty:manage' | 'plan:view' | 'plan:manage';
/** 所有权限码数组 —— 用于遍历、校验、生成菜单 */
export declare const PERMISSION_CODES: PermissionCode[];
/** 权限码 → 显示名称映射 */
export declare const PERMISSION_NAMES: Record<PermissionCode, string>;
/** 权限类型：1=菜单权限 2=操作权限 */
export declare const PERMISSION_TYPES: Record<PermissionCode, 1 | 2>;
/** 按模块分组的权限 —— 方便业务代码引用 */
export declare const PermissionGroups: {
    workbench: PermissionCode[];
    monitor: PermissionCode[];
    alarm: PermissionCode[];
    unit: PermissionCode[];
    device: PermissionCode[];
    maintenance: PermissionCode[];
    patrol: PermissionCode[];
    system: PermissionCode[];
    bigscreen: PermissionCode[];
    ai: PermissionCode[];
    iot: PermissionCode[];
    knowledge: PermissionCode[];
    report: PermissionCode[];
    map: PermissionCode[];
    analysis: PermissionCode[];
    subsystem: PermissionCode[];
    smart: PermissionCode[];
    training: PermissionCode[];
    inspection: PermissionCode[];
    linkage: PermissionCode[];
    duty: PermissionCode[];
    plan: PermissionCode[];
};
/** 校验字符串是否为合法权限码 */
export declare function isValidPermissionCode(code: string): code is PermissionCode;
//# sourceMappingURL=permissions.d.ts.map