/**
 * ═══════════════════════════════════════════════════════════════════
 * 类型定义入口 — Barrel Export
 * 统一从各子模块 re-export，避免类型定义分散
 * ═══════════════════════════════════════════════════════════════════
 */

/* 基础 API 类型与错误处理 */
export * from './api';

/* 数据库/业务实体类型（新体系，camelCase + string ID） */
export * from './db';

/* 消防主机专用类型 */
export * from './fireHost';

/* 地图/GIS 类型 */
export * from './map';

/* 保留旧版 UserInfo（被 useAuth.tsx 引用，兼容旧代码） */
export interface UserInfo {
  userId: number | string;
  username: string;
  realName: string;
  avatar: string | null;
  roles: string[];
  permissions: string[];
}
