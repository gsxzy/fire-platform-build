import type { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { resolvePermissionForPath } from '@/core/permissions';
import ForbiddenPage from '@/sections/ForbiddenPage';

interface RoutePermissionGuardProps {
  routePath: string;
  children: ReactNode;
}

/** 路由级权限守卫：无模块 view 权限时展示 403 页 */
export function RoutePermissionGuard({ routePath, children }: RoutePermissionGuardProps) {
  const { can } = usePermission();
  const required = resolvePermissionForPath(routePath);

  if (!can(required)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
