import type { PlatformModule } from '@/core/platform';
import { MODULES } from '@/core/platform/ModuleRegistry';
import type { UserInfo } from '@/types';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/** 取模块「查看」权限码（用于菜单可见性） */
export function getModuleViewPermission(mod: PlatformModule): string | null {
  const viewPerm = mod.permissions?.find((p) => p.actions?.includes('view'));
  return viewPerm?.code ?? mod.permissions?.[0]?.code ?? null;
}

export function isAdminUser(user: UserInfo | null | undefined): boolean {
  if (!user?.roles?.length) return false;
  return user.roles.some((r) => ADMIN_ROLES.has(r));
}

/**
 * 是否可访问模块菜单
 * - 管理员：全部
 * - 无 permissions 字段或空数组：全部（兼容旧会话）
 * - 否则需具备模块 view 权限码
 */
export function canAccessModule(user: UserInfo | null | undefined, mod: PlatformModule): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;

  const perms = user.permissions;
  if (!perms || perms.length === 0) return true;

  const required = getModuleViewPermission(mod);
  if (!required) return true;

  return perms.includes(required);
}

/** 根据路由路径解析所需「查看」权限（最长前缀匹配） */
export function resolvePermissionForPath(routePath: string): string | null {
  let matched: PlatformModule | null = null;
  let matchedLen = 0;

  const candidates: { path: string; mod: PlatformModule }[] = [];
  for (const mod of MODULES) {
    const paths = new Set<string>();
    if (mod.path) paths.add(mod.path);
    if (mod.menu?.path) paths.add(mod.menu.path);
    mod.menu?.children?.forEach((c) => paths.add(c.path));
    paths.forEach((p) => candidates.push({ path: p, mod }));
  }

  for (const { path, mod } of candidates) {
    if (routePath === path || routePath.startsWith(`${path}/`)) {
      if (path.length >= matchedLen) {
        matchedLen = path.length;
        matched = mod;
      }
    }
  }

  return matched ? getModuleViewPermission(matched) : null;
}

export function hasPermission(
  user: UserInfo | null | undefined,
  permCode: string | string[] | null | undefined
): boolean {
  if (!permCode) return true;
  if (!user) return false;
  if (isAdminUser(user)) return true;

  const perms = user.permissions;
  if (!perms || perms.length === 0) return true;

  const codes = Array.isArray(permCode) ? permCode : [permCode];
  return codes.some((c) => perms.includes(c));
}
